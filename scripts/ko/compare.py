"""Render translator outputs side by side for review.

Usage: python3 scripts/ko/compare.py IN.json OUT_A.json [OUT_B.json ...] -o compare.html
Column titles are taken from the output file names (out-sonnet.json → sonnet).
"""
import argparse
import html
import json
import pathlib

CSS = """
:root{--bg:#fbfaf7;--fg:#1d1b18;--mute:#77716a;--line:#e6e1d8;--card:#fff;--acc:#3b6fd8}
@media (prefers-color-scheme:dark){:root{--bg:#161513;--fg:#ece8e1;--mute:#9a938a;--line:#2e2b27;--card:#1f1d1a;--acc:#7da2f0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);
font:15px/1.55 "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px;z-index:1}
h1{font-size:18px;margin:0}header p{margin:4px 0 0;color:var(--mute);font-size:13px}
main{max-width:1280px;margin:0 auto;padding:16px}
article{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:0 0 16px;overflow:hidden}
.head{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.head b{font-size:17px}.tag{font-size:12px;color:var(--mute)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{padding:7px 12px;border-top:1px solid var(--line);vertical-align:top;text-align:left;overflow-wrap:anywhere}
th{font-size:12px;color:var(--mute);font-weight:600;width:24%}
thead th{color:var(--acc);border-top:0}
.src{color:var(--mute);font-size:13px}.diff td.ko{background:color-mix(in srgb,var(--acc) 7%,transparent)}
@media (max-width:720px){th{width:30%}table{font-size:13px}}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("outs", nargs="+")
    ap.add_argument("-o", "--out", required=True)
    a = ap.parse_args()

    src = json.loads(pathlib.Path(a.src).read_text(encoding="utf-8"))
    names = [pathlib.Path(p).stem.removeprefix("out-") for p in a.outs]
    outs = [json.loads(pathlib.Path(p).read_text(encoding="utf-8")) for p in a.outs]
    esc = html.escape

    def tr(label, source, vals):
        cls = ' class="diff"' if len(set(vals)) > 1 else ""
        cells = "".join(f'<td class="ko">{esc(v)}</td>' for v in vals)
        return f'<tr{cls}><th>{esc(label)}<div class="src">{esc(source)}</div></th>{cells}</tr>'

    cards = []
    for r in src:
        ts = [o.get(r["id"], {}) for o in outs]
        rows = []
        for i, s in enumerate(r["senses"]):
            rows.append(tr(f"뜻 {i + 1} ({s['pos']})", f"{s['en']} · {s['zh']}", [(t.get("s") or [""] * 9)[i] for t in ts]))
        for i, x in enumerate(r["ex"]):
            rows.append(tr(f"예문 {i + 1}", x, [(t.get("ex") or [""] * 9)[i] for t in ts]))
        for i, c in enumerate(r["col"]):
            rows.append(tr("연어", c, [(t.get("col") or [""] * 9)[i] for t in ts]))
        rows.append(tr("팁", r["tip_zh"], [t.get("tip", "") for t in ts]))
        if r["note_zh"]:
            rows.append(tr("주의", r["note_zh"], [t.get("note", "") for t in ts]))
        head = "".join(f"<th>{esc(n)}</th>" for n in names)
        cards.append(
            f'<article><div class="head"><b>{esc(r["w"])}</b><span class="tag">{r["cefr"]}</span></div>'
            f"<table><thead><tr><th></th>{head}</tr></thead><tbody>{''.join(rows)}</tbody></table></article>"
        )

    page = (
        f'<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>번역 파일럿 비교</title>'
        f"<style>{CSS}</style></head><body><header><h1>번역 파일럿 비교 — {' vs '.join(map(esc, names))}</h1>"
        f"<p>{len(src)}단어 · 서로 다른 칸은 옅게 강조 · 왼쪽 회색 글씨는 영어 원문/중국어판</p></header>"
        f"<main>{''.join(cards)}</main></body></html>"
    )
    pathlib.Path(a.out).write_text(page, encoding="utf-8")
    print("wrote", a.out)


if __name__ == "__main__":
    main()
