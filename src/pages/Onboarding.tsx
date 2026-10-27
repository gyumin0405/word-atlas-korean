import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAtlas } from "../atlas/context";
import { store } from "../store/store";

const LEVELS = [
  ["A2", "기초", "일상 단어가 아직 낯설어요"],
  ["B1", "중급", "목표 5.5–6점"],
  ["B2", "중상급", "목표 6.5–7점"],
  ["C1", "고급", "7.5점 이상 도전"],
];

export function Onboarding() {
  const atlas = useAtlas();
  const [level, setLevel] = useState(1);
  const [goal, setGoal] = useState(10);
  const finish = () => store.settings({ onboarded: true, startLevel: atlas.cefr.indexOf(LEVELS[level][0]), dailyNew: goal });
  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="환영합니다">
      <div className="onboard-card">
        <img className="onboard-art" src={`${import.meta.env.BASE_URL}brand/hero.webp`} alt="" />
        <div className="onboard-body">
          <p className="eyebrow">별빛 단어장에 오신 것을 환영해요</p>
          <h1 className="display">
            별 {atlas.count.toLocaleString()}개가
            <br />
            하나씩 밝혀지기를 기다려요.
          </h1>
          <fieldset>
            <legend>어디서 출발할까요?</legend>
            <div className="choice-grid">
              {LEVELS.map(([code, name, desc], i) => (
                <button key={code} className={`choice ${level === i ? "is-on" : ""}`} onClick={() => setLevel(i)} aria-pressed={level === i}>
                  <span className={`chip chip-level lv-${code}`}>{code}</span>
                  <b>{name}</b>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>하루에 새 별을 몇 개 밝힐까요?</legend>
            <div className="segmented segmented-wide">
              {[5, 10, 15, 20].map((n) => (
                <button key={n} className={goal === n ? "is-on" : ""} onClick={() => setGoal(n)} aria-pressed={goal === n}>
                  {n}개{n === 10 ? " · 추천" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-primary btn-xl" onClick={finish}>
            출발 <ArrowRight size={20} />
          </button>
          <p className="muted">가입할 필요 없어요. 진행 상황은 이 기기에만 저장되고, 언제든 ‘내 기록’에서 바꿀 수 있어요.</p>
        </div>
      </div>
    </div>
  );
}
