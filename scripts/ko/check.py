"""Validate Korean translation output against its input batch.

Usage:
  python3 scripts/ko/check.py [n ...]          batches in .local/ko/out (default: all)
  python3 scripts/ko/check.py IN.json OUT.json  any input/output pair (e.g. the pilot)
Output format: {id: {"s": [...], "ex": [...], "col": [...], "tip": str, "note": str}}.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
IN = ROOT / ".local" / "ko" / "in"
OUT = ROOT / ".local" / "ko" / "out"
HANGUL = re.compile(r"[가-힣]")
CJK = re.compile(r"[一-鿿]")
NUMERIC = re.compile(r"[\d\s.,%~()/+-]+")  # e.g. "two hundred" → "200"


def check(src_path, out_path):
    if not out_path.exists():
        return [f"missing output {out_path.name}"]
    try:
        out = json.loads(out_path.read_text(encoding="utf-8"))
    except ValueError as e:
        return [f"invalid JSON: {e}"]
    errs = []
    for r in json.loads(src_path.read_text(encoding="utf-8")):
        t = out.get(r["id"])
        if not isinstance(t, dict):
            errs.append(f"{r['id']}: missing")
            continue
        for k, cnt in (("s", len(r["senses"])), ("ex", len(r["ex"])), ("col", len(r["col"]))):
            v = t.get(k)
            if not isinstance(v, list) or len(v) != cnt:
                errs.append(f"{r['id']}: {k} needs {cnt} items")
            elif any(not isinstance(x, str) or not (HANGUL.search(x) or NUMERIC.fullmatch(x)) for x in v):
                errs.append(f"{r['id']}: {k} has a non-Korean item")
        if r["tip_zh"] and not HANGUL.search(str(t.get("tip", ""))):
            errs.append(f"{r['id']}: tip missing")
        if len(str(t.get("tip", ""))) > 60:
            errs.append(f"{r['id']}: tip over 60 characters")
        if any(isinstance(x, str) and len(x) > 15 for x in t.get("s") or []):
            errs.append(f"{r['id']}: s item over 15 characters")
        if r["note_zh"] and not HANGUL.search(str(t.get("note", ""))):
            errs.append(f"{r['id']}: note missing")
        if CJK.search(json.dumps(t, ensure_ascii=False)):
            errs.append(f"{r['id']}: Chinese characters left")
    return errs


def main():
    args = sys.argv[1:]
    if len(args) == 2 and args[0].endswith(".json"):
        pairs = [(args[1], pathlib.Path(args[0]), pathlib.Path(args[1]))]
    else:
        ns = args or sorted((p.stem for p in OUT.glob("*.json")), key=int)
        pairs = [(n, IN / f"{n}.json", OUT / f"{n}.json") for n in ns]
    bad = 0
    for name, src, out in pairs:
        errs = check(src, out)
        bad += bool(errs)
        print(f"{name}: " + ("OK" if not errs else f"{len(errs)} problems"))
        for e in errs[:20]:
            print("  " + e)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
