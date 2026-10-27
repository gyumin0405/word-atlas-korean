"""Split the atlas into translation batches for the Korean edition.

Writes .local/ko/in/<n>.json, one file per public/atlas/entries/<n>.json chunk,
holding only what a translator needs: English source text plus the Chinese
gloss, tip and note for context.

Usage: python3 scripts/ko/prep.py [--pilot]
  --pilot  also writes .local/ko/pilot/in.json: 100 entries taken evenly across
           the learning order (A1 → C2) for comparing translators.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "atlas" / "entries"
LOCAL = ROOT / ".local" / "ko"


def row(e):
    return {
        "id": e["id"],
        "w": e["w"],
        "cefr": e["cefr"],
        "senses": [{"pos": s["pos"], "en": s["en"], "zh": s["zh"]} for s in e["senses"]],
        "ex": [x["en"] for x in e["ex"]],
        "col": [c.split("｜")[0].strip() for c in e["col"]],
        "tip_zh": e.get("tip", ""),
        "note_zh": e.get("note", ""),
    }


def dump(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    every = []
    for p in sorted(SRC.glob("*.json"), key=lambda p: int(p.stem)):
        rows = [row(e) for e in json.loads(p.read_text(encoding="utf-8"))]
        dump(LOCAL / "in" / p.name, rows)
        every += rows
    print("batches:", len(list((LOCAL / "in").glob("*.json"))))
    if "--pilot" in sys.argv:
        step = len(every) // 100
        dump(LOCAL / "pilot" / "in.json", every[::step][:100])
        print("pilot: 100 entries, every", step)


if __name__ == "__main__":
    main()
