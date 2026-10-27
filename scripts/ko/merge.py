"""Merge Korean translations into the published atlas.

Reads the original (Chinese) chunks from .local/ko/orig (copied there on first
run), applies .local/ko/out/<n>.json, and rewrites:
  public/atlas/entries/<n>.json, public/atlas/index.json,
  data/word-atlas.json, data/word-atlas.csv
Field names stay `zh` so the app code keeps working; their content becomes Korean.
Entries with no valid translation yet fall back to the English definition /
sentence so the app never shows Chinese.
"""
import csv
import json
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from check import CJK, check  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUB = ROOT / "public" / "atlas"
ORIG = ROOT / ".local" / "ko" / "orig"
IN = ROOT / ".local" / "ko" / "in"
OUT = ROOT / ".local" / "ko" / "out"
DATA = ROOT / "data"

TOPICS_KO = {
    "education": "교육", "work": "직업", "technology": "기술", "science": "과학",
    "environment": "환경", "health": "건강", "society": "사회", "government": "정치·법",
    "economy": "경제", "media": "미디어", "arts": "예술", "travel": "여행",
    "city": "도시", "nature": "자연", "daily": "생활", "emotion": "감정",
    "thinking": "사고", "sport": "스포츠", "history": "역사",
}
# Source fixes: spreadsheet-uppercased headwords, and notes that only log an
# edit made to the source ("capitalised …") rather than telling the learner anything.
HEADWORD_FIX = {"true": "true", "false": "false"}
DROP_NOTES = {"o-clock", "post-office", "easter", "united-kingdom", "zipcode", "manila",
              "antarctic", "boxing-day", "living-quarter", "salution"}
NOTE_FIX = {"car-park": "명사는 보통 하이픈 없이 car park로 쓴다."}


def main():
    if not ORIG.exists():
        ORIG.mkdir(parents=True)
        shutil.copytree(PUB / "entries", ORIG / "entries")
        shutil.copy(PUB / "index.json", ORIG / "index.json")

    idx = json.loads((ORIG / "index.json").read_text(encoding="utf-8"))
    done = missing = 0
    by_id = {}
    for p in sorted((ORIG / "entries").glob("*.json"), key=lambda p: int(p.stem)):
        tp = OUT / p.name
        tr = json.loads(tp.read_text(encoding="utf-8")) if tp.exists() and not check(IN / p.name, tp) else {}
        chunk = []
        for e in json.loads(p.read_text(encoding="utf-8")):
            t = tr.get(e["id"])
            if t:
                done += 1
            else:
                missing += 1
                t = {"s": [s["en"] for s in e["senses"]], "ex": [x["en"] for x in e["ex"]],
                     "col": ["" for _ in e["col"]], "tip": "", "note": ""}
            e["senses"] = [{"pos": s["pos"], "zh": t["s"][i], "en": s["en"]} for i, s in enumerate(e["senses"])]
            e["ex"] = [{"en": x["en"], "zh": t["ex"][i]} for i, x in enumerate(e["ex"])]
            e["col"] = [f'{c.split("｜")[0].strip()}｜{t["col"][i]}'.rstrip("｜") for i, c in enumerate(e["col"])]
            e["tip"] = t.get("tip", "")
            e["note"] = "" if e["id"] in DROP_NOTES else NOTE_FIX.get(e["id"], t.get("note", ""))
            e["w"] = HEADWORD_FIX.get(e["id"], e["w"])
            for k in ("fam", "syn", "ant"):  # the source has a few stray Chinese items here
                e[k] = [x for x in e[k] if not CJK.search(x)]
            chunk.append(e)
            by_id[e["id"]] = e
        (PUB / "entries" / p.name).write_text(json.dumps(chunk, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for row in idx["words"]:
        s0 = by_id[row[0]]["senses"][0]
        row[1] = by_id[row[0]]["w"]
        row[2] = f'{s0["pos"]} {s0["zh"]}'.strip()
    idx["topics"] = [[k, TOPICS_KO.get(k, k)] for k, _ in idx["topics"]]
    (PUB / "index.json").write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    public = [{k: v for k, v in by_id[r[0]].items() if k != "m"} for r in idx["words"]]
    (DATA / "word-atlas.json").write_text(json.dumps(public, ensure_ascii=False, indent=1), encoding="utf-8")
    with (DATA / "word-atlas.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "word", "ipa_uk", "ipa_us", "cefr", "topic", "meanings_ko", "definition_en",
                    "example1_en", "example1_ko", "example2_en", "example2_ko", "collocations", "word_family",
                    "synonyms", "antonyms", "tip_ko"])
        for e in public:
            ex = e["ex"] + [{"en": "", "zh": ""}] * (2 - len(e["ex"]))
            w.writerow([e["id"], e["w"], e["uk"], e["us"], e["cefr"], e["topic"],
                        " | ".join(f'{s["pos"]} {s["zh"]}' for s in e["senses"]),
                        " | ".join(s["en"] for s in e["senses"]),
                        ex[0]["en"], ex[0]["zh"], ex[1]["en"], ex[1]["zh"],
                        " ; ".join(e["col"]), " ; ".join(e["fam"]), ", ".join(e["syn"]), ", ".join(e["ant"]), e["tip"]])
    print(f"translated {done}, fallback {missing}")


if __name__ == "__main__":
    main()
