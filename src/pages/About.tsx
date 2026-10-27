import { ArrowUpRight, Database, Github, Heart } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { REPO_URL } from "../config";

const BASE = import.meta.env.BASE_URL;

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about">
      <header className="about-hero">
        <img src={`${BASE}brand/og.webp`} alt="" />
        <div>
          <p className="eyebrow">별빛 단어장 소개</p>
          <h1 className="display">한 단어 한 그림, IELTS를 밝히다.</h1>
          <p className="lede">
            별빛 단어장은 IELTS 리딩 8000단어를 {atlas.count.toLocaleString()}개 항목으로 정리했어요. 단어마다 오리지널 일러스트 한 장, 일상 예문 하나, IELTS 예문 하나에 영국·미국 발음, 자주 쓰는 표현, 헷갈리기 쉬운 점을 담았어요. 하나를 익힐 때마다 내 별자리 지도에 별이 하나 켜져요.
          </p>
          <p className="lede">무료이고, 오픈 소스이며, 가입도 필요 없어요. 코드는 MIT, 단어 데이터는 CC BY 4.0 라이선스라 누구나 가져다 쓸 수 있어요.</p>
          <p className="lede">
            별빛 단어장은{" "}
            <a className="link" href="https://github.com/designfuchen/word-atlas" target="_blank" rel="noreferrer">
              Word Atlas(designfuchen/word-atlas)
            </a>
            의 한국어판이에요. 한국어 뜻, 예문, 자주 쓰는 표현, 팁은 원본 Word Atlas의 내용을 AI(Claude)로 번역해 옮긴 것으로, 항목마다 사람이 검토하지는 않았어요.
          </p>
          <div className="about-actions">
            <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
              <Github size={18} /> GitHub에서 보기
            </a>
            <a className="btn btn-ghost" href={`${REPO_URL}/tree/main/data`} target="_blank" rel="noreferrer">
              <Database size={18} /> 단어 데이터 JSON / CSV 내려받기
            </a>
          </div>
        </div>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h3 className="eyebrow">왜 기억에 남을까</h3>
          <ul className="feature-list">
            <li>
              <b>먼저 보고.</b>단어마다 그림이 한 장씩 있어요. 첫 번째 예문 속 장면을 그대로 그렸어요.
            </li>
            <li>
              <b>다시 떠올리고.</b>뜻 고르기, 그림 보고 빈칸 채우기, 듣고 단어 고르기, 철자 쓰기로 알아보는 단계에서 쓸 수 있는 단계까지 나아가요.
            </li>
            <li>
              <b>잊을 즈음 딱 맞춰 다시 만나요.</b>FSRS는 최신 Anki가 쓰는 오픈 소스 기억 알고리즘이에요. 곧 잊어버릴 때쯤에만 복습을 잡아 줘요.
            </li>
            <li>
              <b>점수는 정직하게.</b>첫 번째 답만 계산해요. 틀린 단어는 다른 문제 유형으로 한 번 더 만나지만, 정답률을 올려 주지는 않아요.
            </li>
            <li>
              <b>진행 상황은 내 것.</b>계정도 서버도 없어요. 데이터는 브라우저에 저장되고 언제든 내보낼 수 있어요.
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="eyebrow">단축키</h3>
          <dl className="keys">
            <div>
              <dt>
                <kbd>⌘</kbd>
                <kbd>K</kbd> 또는 <kbd>/</kbd>
              </dt>
              <dd>단어 검색</dd>
            </div>
            <div>
              <dt>
                <kbd>1</kbd>–<kbd>4</kbd>
              </dt>
              <dd>답 고르기</dd>
            </div>
            <div>
              <dt>
                <kbd>Enter</kbd>
              </dt>
              <dd>확인 / 계속</dd>
            </div>
            <div>
              <dt>
                <kbd>←</kbd> <kbd>→</kbd>
              </dt>
              <dd>단어 카드에서 이전 / 다음 단어</dd>
            </div>
            <div>
              <dt>
                <kbd>Esc</kbd>
              </dt>
              <dd>창 닫기</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h3 className="eyebrow">콘텐츠는 어디서 왔나요</h3>
          <p className="muted">
            뜻, 예문, 표현, 팁은 대규모 언어 모델이 통일된 사전 기준에 따라 새로 썼고, 일러스트는 이미지 모델이 통일된 화풍으로 단어마다 그렸어요. 발음과 읽어 주기 음성은 ElevenLabs로 합성했어요(영국 발음 Alice, 미국 발음 Sarah). 모든 내용은 구조와 일관성을 자동으로 검증했지만, 항목마다 사람이 직접 검수하지는 않았어요. 틀린 곳을 발견하면 GitHub에 Issue를 남기거나 데이터를 직접 고쳐 PR을 보내 주세요.
          </p>
          <p className="muted">별빛 단어장은 공식 IELTS 단어 목록이 아니며, 점수 향상을 약속하지도 않아요. 단어 외우기를 조금 더 보기 좋고, 조금 더 탄탄하게 만들고 싶을 뿐이에요.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">개발자를 위해</h3>
          <p className="muted">
            <code>data/word-atlas.json</code>과 <code>.csv</code>가 전체 단어 데이터예요. <code>public/atlas</code>에는 웹용 분할 데이터, 일러스트, 오디오가 있어요. Anki 덱, 단어 암기 앱, 브라우저 확장 프로그램, AI 애플리케이션 평가 세트 등 무엇을 만들든 출처만 밝혀 주면 돼요.
          </p>
          <a className="link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
            문서 읽기 <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      <p className="colophon">
        <Heart size={14} /> 단어를 외우고 있는 모든 분께.
      </p>
    </div>
  );
}
