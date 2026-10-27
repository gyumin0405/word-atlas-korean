import { Bookmark, BookmarkCheck, Lightbulb, Share2 } from "lucide-react";
import type { Entry, WordRef } from "../atlas/types";
import { useAtlas } from "../atlas/context";
import { splitHighlight, splitPair } from "../lib/text";
import { formatInterval, isMastered } from "../store/srs";
import { toggleBookmark, useStore } from "../store/store";
import { Illustration } from "./Illustration";
import { Speak } from "./Speak";
import { shareWord } from "./share";
import { openWord } from "../lib/router";

export function Highlight({ text, word }: { text: string; word: string }) {
  const parts = splitHighlight(text, word);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <mark>{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

export function Pronounce({ entry, refw }: { entry: Entry; refw: WordRef | Entry }) {
  const atlas = useAtlas();
  const accent = useStore((s) => s.settings.accent);
  const both = entry.uk && entry.us && entry.uk !== entry.us;
  const items: ["uk" | "us", string, string][] = both
    ? [["uk", "영", entry.uk], ["us", "미", entry.us]]
    : [[accent, accent === "uk" ? "영" : "미", entry.uk || entry.us]];
  if (!both && items[0][2] === "") return null;
  return (
    <div className="pron">
      {(accent === "us" ? [...items].reverse() : items).map(([acc, label, ipa]) => (
        <Speak
          key={acc}
          url={atlas.audio(refw, acc)}
          text={entry.w}
          accent={acc}
          size="sm"
          label={
            <>
              <em>{label}</em>
              <span className="ipa">{ipa}</span>
            </>
          }
        />
      ))}
    </div>
  );
}

export function EntryView({ entry, mode = "detail", eager = true }: { entry: Entry; mode?: "detail" | "intro" | "reveal"; eager?: boolean }) {
  const atlas = useAtlas();
  const ref = atlas.byId.get(entry.id);
  const card = useStore((s) => s.progress.cards[entry.id]);
  const saved = useStore((s) => s.progress.bookmarks.includes(entry.id));
  const accent = useStore((s) => s.settings.accent);
  const topicIdx = atlas.topics.findIndex((t) => t[0] === entry.topic);
  const topic = atlas.topics[topicIdx];
  const exUrls = [atlas.audio(entry, "ex"), atlas.audio(entry, "ex2")];
  const famLinks = entry.fam.map((f) => {
    const w = f.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
    const hit = atlas.words.find((x) => x.word.toLowerCase() === w);
    return { label: f, id: hit?.id };
  });
  const status = card ? (isMastered(card) ? "익힘" : "학습 중") : null;

  return (
    <article className={`entry entry-${mode}`}>
      <div className="entry-art">
        <Illustration src={atlas.img(entry)} word={entry.w} topic={topicIdx} eager={eager} alt={`${entry.w} 일러스트`} />
      </div>
      <div className="entry-body">
        <header className="entry-head">
          <div className="entry-tags">
            <span className={`chip chip-level lv-${entry.cefr}`}>{entry.cefr}</span>
            {topic && <span className="chip">{topic[1]}</span>}
            {status && <span className={`chip chip-status ${status === "익힘" ? "is-done" : ""}`}>{status}</span>}
          </div>
          {mode === "detail" && (
            <div className="entry-actions">
              <button className={`icon-btn ${saved ? "is-on" : ""}`} onClick={() => toggleBookmark(entry.id)} aria-pressed={saved} aria-label={saved ? "북마크 해제" : "북마크"} title={saved ? "북마크 해제" : "북마크"}>
                {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
              </button>
              <button className="icon-btn" onClick={() => shareWord(atlas, entry)} aria-label="공유 카드 만들기" title="공유 카드 만들기">
                <Share2 size={19} />
              </button>
            </div>
          )}
        </header>
        {ref && (
          <p className="specimen">
            № {String(ref.order + 1).padStart(4, "0")}
            <i />
            Word Atlas
          </p>
        )}
        <h2 className="headword" lang="en">
          {entry.w}
        </h2>
        <Pronounce entry={entry} refw={ref ?? entry} />

        <ol className="senses">
          {entry.senses.map((s, i) => (
            <li key={i}>
              <span className="pos">{s.pos}</span>
              <span className="zh">{s.zh}</span>
              {s.en && (
                <span className="en" lang="en">
                  {s.en}
                </span>
              )}
            </li>
          ))}
        </ol>

        {entry.ex.length > 0 && (
          <section className="block">
            <h3 className="eyebrow">예문</h3>
            <ul className="examples">
              {entry.ex.map((x, i) => (
                <li key={i}>
                  {entry.ex.length > 1 && <span className={`ex-tag ${i ? "is-ielts" : ""}`}>{i ? "IELTS 문맥" : "일상"}</span>}
                  <p className="ex-en" lang="en">
                    <Highlight text={x.en} word={entry.w} />
                    <Speak url={exUrls[i] ?? null} text={x.en} accent={i === 1 && exUrls[1] ? "us" : accent} size="sm" className="ex-speak" />
                  </p>
                  <p className="ex-zh">{x.zh}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entry.col.length > 0 && (
          <section className="block">
            <h3 className="eyebrow">자주 쓰는 표현</h3>
            <ul className="collocations">
              {entry.col.map((c) => {
                const { en, zh } = splitPair(c);
                return (
                  <li key={c}>
                    <span lang="en">{en}</span>
                    {zh && <small>{zh}</small>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {(famLinks.length > 0 || entry.syn.length > 0 || entry.ant.length > 0) && (
          <section className="block relations">
            {famLinks.length > 0 && (
              <div>
                <h3 className="eyebrow">파생어</h3>
                <p>
                  {famLinks.map((f) =>
                    f.id && mode === "detail" ? (
                      <button key={f.label} className="link" onClick={() => openWord(f.id!)}>
                        {f.label}
                      </button>
                    ) : (
                      <span key={f.label}>{f.label}</span>
                    ),
                  )}
                </p>
              </div>
            )}
            {entry.syn.length > 0 && (
              <div>
                <h3 className="eyebrow">유의어</h3>
                <p>{entry.syn.map((s) => <span key={s}>{s}</span>)}</p>
              </div>
            )}
            {entry.ant.length > 0 && (
              <div>
                <h3 className="eyebrow">반의어</h3>
                <p>{entry.ant.map((s) => <span key={s}>{s}</span>)}</p>
              </div>
            )}
          </section>
        )}

        {entry.tip && (
          <aside className="tip">
            <Lightbulb size={17} strokeWidth={1.8} />
            <p>{entry.tip}</p>
          </aside>
        )}

        {entry.note && <p className="usage-note">주의: {entry.note}</p>}

        {mode === "detail" && card && (
          <p className="memory-note">
            {card.due <= Date.now() ? "지금 복습할 수 있어요" : `다음 복습: ${formatInterval(card.due - Date.now())} 후`} · 기억 안정도 {card.s < 1 ? "<1" : Math.round(card.s)}일 · 복습 {card.reps}회
          </p>
        )}
      </div>
    </article>
  );
}
