import { Download, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { useAtlas } from "../atlas/context";
import { isMastered } from "../store/srs";
import { dayKey, exportBackup, importBackup, resetProgress, store, useStore, type Settings } from "../store/store";
import { toast } from "../ui/Toast";
import { streakOf } from "./Today";

export function Me({ privateAvailable }: { privateAvailable: boolean }) {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const saveError = useStore((s) => s.saveError);
  const file = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const cards = Object.values(progress.cards);
    const days = Object.values(progress.days);
    const r = days.reduce((n, d) => n + d.r, 0);
    const c = days.reduce((n, d) => n + d.c, 0);
    const t = days.reduce((n, d) => n + d.t, 0);
    const now = Date.now();
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + i);
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      return cards.filter((x) => (i === 0 ? x.due <= end.getTime() : x.due >= start.getTime() && x.due <= end.getTime())).length;
    });
    void now;
    return { learned: cards.length, mastered: cards.filter(isMastered).length, reviews: r, accuracy: r ? Math.round((c / r) * 100) : 0, minutes: Math.round(t / 60), forecast };
  }, [progress]);

  const set = (patch: Partial<Settings>) => store.settings(patch);
  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `word-atlas-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const restore = async (f: File) => {
    if (f.size > 30 * 1024 * 1024) return toast("파일이 너무 커요. 학습 백업 파일이 아닌 것 같아요.", "warn");
    const r = importBackup(await f.text());
    toast(r.ok ? `단어 ${r.cards}개의 기록을 복원했어요` : r.error, r.ok ? "ok" : "warn");
  };
  const maxF = Math.max(1, ...stats.forecast);

  return (
    <div className="page me">
      <header className="page-head">
        <p className="eyebrow">내 기록</p>
        <h1 className="display">나의 밤하늘</h1>
      </header>

      <section className="stat-strip">
        <div>
          <dt>연속 학습</dt>
          <dd>
            {streakOf(progress.days)}
            <small>일</small>
          </dd>
        </div>
        <div>
          <dt>밝힌 별</dt>
          <dd>{stats.learned.toLocaleString()}</dd>
        </div>
        <div>
          <dt>장기 기억</dt>
          <dd>{stats.mastered.toLocaleString()}</dd>
        </div>
        <div>
          <dt>첫 시도 정답률</dt>
          <dd>
            {stats.accuracy}
            <small>%</small>
          </dd>
        </div>
        <div>
          <dt>학습 시간</dt>
          <dd>
            {stats.minutes}
            <small>분</small>
          </dd>
        </div>
      </section>

      <div className="me-grid">
        <section className="panel">
          <h3 className="eyebrow">지난 20주</h3>
          <Heatmap days={progress.days} />
          <p className="muted">한 칸이 하루예요. 색이 진할수록 그날 많이 풀었어요. ‘장기 기억’은 기억 안정도가 21일을 넘은 단어예요.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">앞으로 7일 복습량</h3>
          <ol className="forecast">
            {stats.forecast.map((n, i) => (
              <li key={i}>
                <span style={{ height: `${(n / maxF) * 100}%` }} />
                <b>{n}</b>
                <small>{i === 0 ? "오늘" : i === 1 ? "내일" : `+${i}`}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel settings">
          <h3 className="eyebrow">학습 설정</h3>
          <Field label="하루 새 단어" hint="복습은 제한이 없어요. 알고리즘이 곧 잊어버릴 단어만 골라 줘요.">
            <div className="segmented">
              {[5, 10, 15, 20, 30].map((n) => (
                <button key={n} className={settings.dailyNew === n ? "is-on" : ""} onClick={() => set({ dailyNew: n })}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="시작 난이도" hint="이미 익숙한 낮은 단계 단어는 건너뛰어요.">
            <div className="segmented">
              {atlas.cefr.map((l, i) => (
                <button key={l} className={settings.startLevel === i ? "is-on" : ""} onClick={() => set({ startLevel: i })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="목표 기억률" hint="높을수록 복습이 잦아져요. 대부분은 90%가 가장 알맞아요.">
            <div className="segmented">
              {[0.85, 0.9, 0.95].map((n) => (
                <button key={n} className={settings.retention === n ? "is-on" : ""} onClick={() => set({ retention: n })}>
                  {Math.round(n * 100)}%
                </button>
              ))}
            </div>
          </Field>
          <Field label="발음">
            <div className="segmented">
              <button className={settings.accent === "uk" ? "is-on" : ""} onClick={() => set({ accent: "uk" })}>
                영국식
              </button>
              <button className={settings.accent === "us" ? "is-on" : ""} onClick={() => set({ accent: "us" })}>
                미국식
              </button>
            </div>
          </Field>
          <Field label="화면 테마">
            <div className="segmented">
              {(
                [
                  ["system", "시스템 설정 따르기"],
                  ["light", "라이트"],
                  ["dark", "다크"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={settings.theme === k ? "is-on" : ""} onClick={() => set({ theme: k })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Toggle label="발음 자동 재생" on={settings.autoplay} set={(v) => set({ autoplay: v })} />
          <Toggle label="효과음" on={settings.sfx} set={(v) => set({ sfx: v })} />
          <Toggle label="시작 애니메이션 (하루 한 번)" on={settings.splash} set={(v) => set({ splash: v })} />
          <Toggle label="복습에 철자 문제 넣기" on={settings.spell} set={(v) => set({ spell: v })} />
          {privateAvailable && (
            <Field label="단어장" hint="개인 단어장은 로컬 개발 서버에서만 쓸 수 있고, 배포 빌드에는 포함되지 않아요.">
              <div className="segmented">
                <button className={settings.dataset === "open" ? "is-on" : ""} onClick={() => set({ dataset: "open" })}>
                  공개 도감
                </button>
                <button className={settings.dataset === "private" ? "is-on" : ""} onClick={() => set({ dataset: "private" })}>
                  개인 8000
                </button>
              </div>
            </Field>
          )}
        </section>

        <section className="panel">
          <h3 className="eyebrow">데이터</h3>
          <p className="muted">진행 상황은 이 기기의 브라우저에만 저장돼요. 계정도 서버도 없어요. 기기를 바꿀 때는 백업을 내보낸 뒤 새 기기에서 가져오면 돼요.</p>
          {saveError && <p className="warn-text">브라우저가 저장을 거부했어요(시크릿 모드이거나 저장 공간이 부족할 수 있어요). 되도록 빨리 백업을 내보내세요.</p>}
          <div className="data-actions">
            <button className="btn btn-ghost" onClick={download}>
              <Download size={18} /> 백업 내보내기
            </button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Upload size={18} /> 백업 가져오기
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0]).finally(() => (e.target.value = ""))} />
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                if (confirm("이 단어장의 학습 기록을 모두 지울까요? 되돌릴 수 없으니 먼저 백업을 내보내 두세요.")) {
                  resetProgress();
                  toast("학습 기록을 지웠어요");
                }
              }}
            >
              <RotateCcw size={18} /> 기록 지우기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="field toggle">
      <b>{label}</b>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

function Heatmap({ days }: { days: Record<string, { r: number }> }) {
  const weeks = 20;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const cells: { k: string; v: number; future: boolean }[] = [];
  const d = new Date(start);
  for (let i = 0; i < (weeks + 1) * 7; i++) {
    const k = dayKey(d);
    cells.push({ k, v: days[k]?.r ?? 0, future: d > end });
    d.setDate(d.getDate() + 1);
  }
  const lvl = (v: number) => (v === 0 ? 0 : v < 10 ? 1 : v < 25 ? 2 : v < 50 ? 3 : 4);
  return (
    <div className="heatmap" role="img" aria-label="학습 히트맵">
      {cells.map((c) => (
        <span key={c.k} className={`h${c.future ? "x" : lvl(c.v)}`} title={`${c.k} · ${c.v}문제`} />
      ))}
    </div>
  );
}
