"""Translate the atlas into Korean with the OpenRouter Batch API (about half price).

Each request is one 100-entry batch from .local/ko/in (made by prep.py), sent to
the Anthropic Messages endpoint with scripts/ko/prompt.md as the system prompt.

Usage (needs OPENROUTER_API_KEY in the environment or in .env):
  python3 scripts/ko/batch.py submit [n ...]   default: every batch with no valid output yet
  python3 scripts/ko/batch.py submit --pilot   only the 100-word pilot → .local/ko/pilot/out-api.json
  python3 scripts/ko/batch.py submit --dry-run print what would be sent and a cost estimate
  python3 scripts/ko/batch.py status [batch_id]   default: the last submitted batch
  python3 scripts/ko/batch.py fetch  [batch_id]   write finished results to .local/ko/out/<n>.json

Every submission is recorded in .local/ko/batches.json. Results are kept 30 days
on OpenRouter; fetch can be re-run safely.
"""
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOCAL = ROOT / ".local" / "ko"
IN, OUT, RAW = LOCAL / "in", LOCAL / "out", LOCAL / "raw"
PILOT = LOCAL / "pilot"
LOG = LOCAL / "batches.json"
API = "https://openrouter.ai/api/v1/batches"
MODEL = os.environ.get("KO_MODEL", "anthropic/claude-opus-5.5")
EFFORT = os.environ.get("KO_EFFORT", "medium")
PRICE_IN, PRICE_OUT = 2.0, 10.0  # $/1M tokens, Opus 5.5 batch on OpenRouter

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from check import check  # noqa: E402


def api_key():
    key = os.environ.get("OPENROUTER_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                key = line.split("=", 1)[1].strip().strip("'\"")
    if not key:
        sys.exit("OPENROUTER_API_KEY is not set (environment or .env)")
    return key


def call(method, url, body=None):
    req = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode(errors='replace')}")


def request_body(rows):
    return {
        "model": MODEL,
        "max_tokens": 64000,
        "output_config": {"effort": EFFORT},
        "system": [{"type": "text", "text": (ROOT / "scripts/ko/prompt.md").read_text(encoding="utf-8"),
                    "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": json.dumps(rows, ensure_ascii=False)}],
    }


def load_log():
    return json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else []


def target(custom_id):
    """Where a custom_id's result goes, and the input it is checked against."""
    if custom_id == "pilot":
        return PILOT / "in.json", PILOT / "out-api.json"
    n = custom_id.removeprefix("chunk-")
    return IN / f"{n}.json", OUT / f"{n}.json"


def submit(args):
    dry = "--dry-run" in args
    if "--pilot" in args:
        jobs = [("pilot", PILOT / "in.json")]
    else:
        ns = [a for a in args if a.isdigit()] or sorted(
            (p.stem for p in IN.glob("*.json") if check(p, OUT / p.name)), key=int)
        jobs = [(f"chunk-{n}", IN / f"{n}.json") for n in ns]
    if not jobs:
        print("nothing to submit: every batch already has valid output")
        return
    requests = [{"custom_id": cid, "body": request_body(json.loads(p.read_text(encoding="utf-8")))}
                for cid, p in jobs]
    # Rough estimate: ~3.5 chars/token in, Korean output ≈ 0.7× input tokens + thinking.
    chars = sum(len(r["body"]["messages"][0]["content"]) + len(r["body"]["system"][0]["text"]) for r in requests)
    tin = chars / 3.5
    tout = tin * 1.0
    print(f"{len(requests)} requests, model {MODEL}, effort {EFFORT}")
    print(f"estimate: ~{tin / 1e6:.2f}M in, ~{tout / 1e6:.2f}M out → ~${tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT:.2f}")
    if dry:
        return
    batch = call("POST", API, {"endpoint": "/v1/messages", "model": MODEL, "requests": requests})
    log = load_log()
    log.append({"id": batch["id"], "model": MODEL, "custom_ids": [cid for cid, _ in jobs], "created_at": batch["created_at"]})
    LOG.write_text(json.dumps(log, indent=1), encoding="utf-8")
    print("submitted", batch["id"], batch["status"])


def batch_id(args):
    if args:
        return args[0]
    log = load_log()
    if not log:
        sys.exit("no batch submitted yet")
    return log[-1]["id"]


def status(args):
    b = call("GET", f"{API}/{batch_id(args)}")
    c = b["request_counts"]
    print(f"{b['id']}: {b['status']}  completed {c['completed']}/{c['total']}, failed {c['failed']}")
    if b.get("usage"):
        print("usage:", json.dumps(b["usage"]))
    if b.get("error"):
        print("error:", b["error"]["message"])


def parse(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    return json.loads(text[text.index("{"): text.rindex("}") + 1])


def fetch(args):
    b = call("GET", f"{API}/{batch_id(args)}")
    if b["results"] is None:
        sys.exit(f"{b['id']} is {b['status']}; no results yet")
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    ok, bad = 0, []
    for r in sorted(b["results"], key=lambda r: r["custom_id"]):
        cid = r["custom_id"]
        src, dst = target(cid)
        if r["error"] or not r["response"] or r["response"]["status_code"] != 200:
            bad.append(f"{cid}: {r['error'] or r['response']}")
            continue
        body = r["response"]["body"]
        text = "".join(c.get("text", "") for c in body.get("content", []) if c.get("type") == "text")
        (RAW / f"{cid}.txt").write_text(text, encoding="utf-8")
        if body.get("stop_reason") != "end_turn":
            bad.append(f"{cid}: stop_reason {body.get('stop_reason')}")
            continue
        try:
            data = parse(text)
        except ValueError as e:
            bad.append(f"{cid}: unparsable JSON ({e}); raw text in {RAW / (cid + '.txt')}")
            continue
        dst.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        errs = check(src, dst)
        if errs:
            bad.append(f"{cid}: {len(errs)} check problems, e.g. {errs[0]}")
        else:
            ok += 1
    print(f"{b['id']}: {ok} valid, {len(bad)} need attention")
    for line in bad:
        print("  " + line)
    if b.get("usage"):
        print("usage:", json.dumps(b["usage"]))
    if bad:
        print("resubmit the failed chunks with: python3 scripts/ko/batch.py submit <n ...>")


def main():
    cmd, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("", [])
    {"submit": submit, "status": status, "fetch": fetch}.get(cmd, lambda _: sys.exit(__doc__))(args)


if __name__ == "__main__":
    main()
