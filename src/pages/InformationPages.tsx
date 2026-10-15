import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Clock3,
  FileText,
  ShieldCheck,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button, DefinitionTable, Notice, PageHeading } from "../components/UI";
import { labels } from "../domain/types";
import s from "../App.module.css";
export function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? ""),
    [category, setCategory] = useState("all");
  const search = params.get("q") ?? "";
  const matched =
    !search ||
    /일상|업무|유예|심사|과제|학업|청소|운동|정리|답장|일정|휴식|피로|의욕|미루|쉬|내일|핑계|rest|delay/i.test(
      search,
    );
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="민원서비스"
        title="오늘의 사유를 접수합니다."
        description="일상의 의무를 미루고 싶은 순간, 정식 절차로 신청해 주세요."
      />
      <form
        className={s.serviceSearch}
        onSubmit={(e) => {
          e.preventDefault();
          setParams(query ? { q: query } : {});
        }}
      >
        <Search size={21} />
        <input
          aria-label="서비스 검색어"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="민원명 또는 미루고 싶은 일 검색"
        />
        <button className={s.button}>검색</button>
      </form>
      <div className={s.serviceFilters}>
        <label>
          업무 종류
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">전체</option>
            {Object.entries(labels.category).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <span>
          검색결과 <strong>{matched ? 1 : 0}</strong>건
          {search && ` · “${search}”`}
        </span>
      </div>
      {matched ? (
        <article className={s.serviceArticle}>
          <div className={s.serviceArticleTop}>
            <span className={s.tag}>온라인 신청</span>
            <span>민원접수국 · 생활사유심사국</span>
          </div>
          <h2>
            <Link to="/services/defer">일상업무 유예 심사</Link>
          </h2>
          <p>
            해야 할 일과 유예가 필요한 사유를 제출하면, 구체성과 유예 적정성을
            검토해 공문서 PDF로 결과를 발급합니다.
          </p>
          <div className={s.serviceFacts}>
            <span>
              <Clock3 size={17} />
              프로그램 즉시 심사
            </span>
            <span>
              <FileText size={17} />
              사건별 서류 발급
            </span>
            <span>
              <ShieldCheck size={17} />
              무료 · 가입 불필요
            </span>
          </div>
          <div className={s.actions}>
            <Button
              to={`/apply${category === "all" ? "" : `?category=${category}`}`}
            >
              신청하기 <ArrowRight size={17} />
            </Button>
            <Button secondary to="/services/defer">
              서비스 상세
            </Button>
          </div>
        </article>
      ) : (
        <div className={s.emptyState}>
          <h2>검색한 사유와 일치하는 민원이 없습니다.</h2>
          <p>
            ‘유예’, ‘과제’, ‘휴식’ 등의 검색어를 입력하거나 전체 민원을 확인해
            주세요.
          </p>
          <Button
            secondary
            onClick={() => {
              setQuery("");
              setParams({});
            }}
          >
            전체 민원 보기
          </Button>
        </div>
      )}
      <Notice>
        V1은 ‘일상업무 유예 심사’ 한 종목을 운영합니다. 학업·과제, 청소, 운동
        등은 신청서에서 업무 종류로 선택합니다.
      </Notice>
    </div>
  );
}
export function ServiceDetail() {
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="민원 안내 · 생활상 의무 유예"
        title="일상업무 유예 심사"
        description="귀하의 사정을 행정적으로 검토하고, 그 결과를 정식 문서로 남깁니다."
      />
      <div className={s.detailLayout}>
        <section>
          <DefinitionTable
            rows={[
              [
                "신청 대상",
                "사소한 개인 일상업무의 착수를 잠시 미루고 싶은 누구나",
              ],
              ["신청 방법", "온라인 전자신청 · 별칭으로 접수"],
              [
                "처리기간",
                "심사 시작 시 즉시 판정 · 진행 화면은 프로그램 연출",
              ],
              ["수수료", "없음"],
              ["제출 자료", "해야 할 일, 신청 사유, 유예시간, 실제 마감기한"],
              ["처리기관", "생활사유심사국 제1사유심사과"],
              [
                "결과 서류",
                "신청서·접수증·심사조서·내부결재서·처리결과 통지서 등",
              ],
            ]}
          />
          <h2>신청부터 문서 발급까지</h2>
          <ol className={s.detailSteps}>
            {[
              ["신청서 작성", "업무와 사유, 유예시간을 작성합니다."],
              [
                "확인 및 동의",
                "입력 내용을 검토하고 필수 확인사항에 동의합니다.",
              ],
              [
                "접수 및 심사",
                "접수번호를 부여하고 제출 사유를 규칙에 따라 판단합니다.",
              ],
              [
                "결과 및 문서 발급",
                "심사 의견과 첫 행동을 확인하고 PDF를 내려받습니다.",
              ],
            ].map(([title, desc], i) => (
              <li key={title}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <h2>신청 전 유의사항</h2>
          <ul className={s.proseList}>
            <li>
              실제 업무·학업 의무나 외부기관의 마감기한을 변경하는 서비스가
              아닙니다.
            </li>
            <li>
              의욕 부족의 발생 가능성과 내일 의욕이 회복될 가능성은 별개로
              심사합니다.
            </li>
            <li>판단정보가 부족하면 보완자료를 1회 요청할 수 있습니다.</li>
            <li>
              불승인 처분에는 새로운 사실을 제시하여 1회 이의신청할 수 있습니다.
            </li>
            <li>
              민원 기록은 같은 브라우저에서만 확인할 수 있습니다. JSON 백업을
              권장합니다.
            </li>
          </ul>
        </section>
        <aside className={s.detailAside}>
          <img src={`${import.meta.env.BASE_URL}brand/emblem.svg`} alt="" />
          <h2>사유의 크기는 묻지 않습니다.</h2>
          <p>다만, 그 사유가 적정한지는 검토합니다.</p>
          <Button to="/apply">
            민원 신청하기 <ArrowRight size={17} />
          </Button>
          <span>무료 · 로그인 없이 이용</span>
          <Link to="/help?topic=review">
            심사기준 미리 확인하기 <ChevronRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
const faqs = [
  {
    id: "virtual",
    title: "국립핑계관리청은 실제 국가기관인가요?",
    body: "아닙니다. 국립핑계관리청은 일상의 미루기를 소재로 한 풍자 창작기관입니다. 모든 심사, 결재, 공문서와 관인은 가상의 설정이며 실제 행정적·법적 효력이 없습니다. 발급문서는 질병, 출석, 고용, 허가 또는 실제 외부 사실의 증빙으로 사용할 수 없습니다.",
  },
  {
    id: "storage",
    title: "민원 내용은 어디에 저장되나요?",
    body: "신청서, 심사 결정, 서류 정보와 임시작성 내용은 이 브라우저의 IndexedDB에 저장됩니다. 서버 계정이나 외부 전송이 없습니다. 브라우저 기록을 삭제하거나 시크릿 창을 닫으면 사라질 수 있습니다. 나의 민원에서 JSON 내보내기를 하고, 다른 브라우저에서는 백업 가져오기를 이용하세요. 기존 사건과 같은 접수번호 또는 사건 ID는 덮어쓰지 않습니다.",
  },
  {
    id: "review",
    title: "어떤 기준으로 심사하나요?",
    body: "AI 없이 브라우저에서 실행되는 문장 규칙 심사 v2.0을 사용합니다. 입력한 문장에서 업무 진행 상태, 피로·일정·외부 대기 등의 사유, 마감기한, 복귀 시점과 첫 행동을 찾아 함께 검토합니다. 부정 표현과 단어의 반복은 실제 사정이나 실행계획으로 보지 않습니다. 서로 다른 기한이 적혔거나 판단정보가 부족하면 필요한 사항을 짚어 1회 보완을 요청합니다. 오늘 마감과 하루 유예가 충돌하는 신청은 엄격 심사에서 불승인됩니다. 기한이 없고 짧은 유예이며 실행 가능한 복귀 계획이 있으면 승인될 수 있습니다. 새로운 이의신청도 이전 내용과 비교합니다. 정해진 표현과 상황을 다루는 규칙이므로 모든 문맥·반어·복잡한 시간관계를 이해하지는 못합니다. 기존 사건의 결정과 문서는 바뀌지 않으며 새 심사부터 적용됩니다.",
  },
  {
    id: "supplement",
    title: "보완요구를 받으면 어떻게 하나요?",
    body: "나의 민원 → 해당 사건 → 보완자료 제출에서 실제 마감에 관한 정황, 시간 산정 근거, 유예 후 수행 계획을 10~1,500자의 텍스트로 작성해 주세요. 실제 파일은 제출하지 않습니다. 보완은 1회로 제한되며, 보완 후에는 추가 보완요구 없이 최종 처분합니다.",
  },
  {
    id: "appeal",
    title: "불승인 결과에 이의를 제기할 수 있나요?",
    body: "불승인 사건의 처리결과 화면에서 1회 이의신청할 수 있습니다. 이의 취지와 새롭게 확인한 사실 또는 구체적인 이행계획을 작성하세요. 재심사 결과 원처분을 유지하거나 조건부 승인으로 변경합니다. 최초 처리결과 통지서는 그대로 보존하며, 이의신청서(F-08)와 재심사 통지서(F-09)를 별도로 발급합니다.",
  },
  {
    id: "printing",
    title: "어떤 서류가 발급되며 어떻게 인쇄하나요?",
    body: "신청, 접수, 보완, 심사, 결재, 처분, 승인, 이의신청과 재심사에 대응하는 F-01~F-09의 9종 서식을 제공합니다. 해당 사건에서 실제 발생한 문서만 발급합니다. PDF는 한글 글꼴을 내장한 검색 가능한 벡터 문서입니다. 인쇄 버튼으로 PDF를 열고 브라우저 또는 PDF 뷰어에서 A4, 실제 크기(100%)를 선택하세요. 여백을 추가하거나 화면 맞춤을 적용하지 않는 것을 권장합니다.",
  },
  {
    id: "recovery",
    title: "저장이나 PDF 미리보기가 작동하지 않아요.",
    body: "브라우저에서 저장소 접근이 제한되면 화면에 안내하고 현재 탭의 임시 메모리로 처리합니다. 이때 새로고침 전에 JSON 백업과 PDF를 내려받아야 합니다. PDF용 글꼴을 처음 불러올 때는 네트워크가 필요합니다. 불러오기에 실패하면 빈 PDF를 발급하지 않고 재시도를 안내합니다. 모바일에서 미리보기가 제한되면 PDF 내려받기를 사용하세요. 이미 읽어온 코드와 글꼴은 현재 탭에서 외부 심사 API 없이 사용할 수 있습니다.",
  },
];
export function HelpPage() {
  const [params] = useSearchParams();
  const topic = params.get("topic");
  useEffect(() => {
    if (topic) {
      const timer = requestAnimationFrame(() =>
        document
          .getElementById(`help-${topic}`)
          ?.scrollIntoView({ block: "start" }),
      );
      return () => cancelAnimationFrame(timer);
    }
  }, [topic]);
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="이용안내"
        title="사유보다 먼저 확인할 사항"
        description="신청·심사·발급과 기록 보관에 관한 안내입니다."
      />
      <Notice>
        본 서비스는 무료 풍자 창작물입니다. 실명 인증, 실제 증빙, 이메일·문자
        발송, 결제 및 유료 AI 기능은 제공하지 않습니다.
      </Notice>
      <div className={s.helpLayout}>
        <aside>
          <strong>이용안내</strong>
          {faqs.map((f) => (
            <Link
              key={f.id}
              to={`/help?topic=${f.id}`}
              className={topic === f.id ? s.helpActive : ""}
            >
              {f.title}
              <ChevronRight size={14} />
            </Link>
          ))}
          <Link to="/help?topic=sources">
            디자인·기술 자료 출처
            <ArrowUpRight size={14} />
          </Link>
        </aside>
        <section>
          <h2>자주 묻는 질문</h2>
          {faqs.map((f) => (
            <details
              id={`help-${f.id}`}
              className={s.faq}
              key={f.id}
              open={topic === f.id || undefined}
            >
              <summary>
                <span>Q.</span>
                {f.title}
                <PlusIcon />
              </summary>
              <p>{f.body}</p>
            </details>
          ))}
          <section id="help-sources" className={s.sourceSection}>
            <h2>디자인·기술 자료 출처</h2>
            <p>
              정보구조와 서식 관행을 연구한 참고자료입니다. 실제 기관의
              표장·관인·연락처는 복제하지 않았습니다. 아래 법규와 편람은 본
              창작문서에 효력을 부여하지 않습니다.
            </p>
            {[
              ["대한민국 정부 디자인 시스템 (KRDS)", "https://www.krds.go.kr/"],
              [
                "KRDS · 신청서 작성 서비스 패턴",
                "https://www.krds.go.kr/html/site/service/service_04_05.html",
              ],
              [
                "행정안전부 · 2025 행정업무운영 편람",
                "https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000012&nttId=122878",
              ],
              [
                "행정업무의 운영 및 혁신에 관한 규정 시행규칙",
                "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=252189",
              ],
              [
                "Vite · 정적 사이트 배포",
                "https://vite.dev/guide/static-deploy.html",
              ],
              ["React PDF · 글꼴 등록", "https://react-pdf.org/docs/v4/fonts"],
              [
                "Noto Sans KR · SIL OFL",
                "https://fonts.google.com/noto/specimen/Noto+Sans+KR",
              ],
              ["나눔고딕·나눔명조 · SIL OFL", "https://hangeul.naver.com/font"],
            ].map(([title, url]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {title}
                <ArrowUpRight size={15} />
              </a>
            ))}
          </section>
        </section>
      </div>
    </div>
  );
}
function PlusIcon() {
  return (
    <span className={s.plusIcon} aria-hidden="true">
      +
    </span>
  );
}
export function AboutPage() {
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="기관소개"
        title="사소한 사유도, 정식 절차로."
        description="국립핑계관리청은 미루고 싶은 일과 그럴듯한 사유 사이의 질서를 다루는 가상 행정기관입니다."
      />
      <div className={s.aboutIntro}>
        <div>
          <p className={s.eyebrow}>기관장 인사말 · 창작 설정</p>
          <h2>
            오늘의 귀하에게도
            <br />말 못 할 사정이 있음을 압니다.
          </h2>
          <p>하지만 내일의 귀하에게도 사정이 있을 수 있습니다.</p>
          <p>
            본 청은 모든 사유를 존중하되, 그 사유가 내일 사라질 것이라는
            주장까지 무조건 인정하지는 않습니다. 접수부터 심사, 결재, 통지까지
            빈틈없는 절차로 귀하의 일상을 검토하겠습니다.
          </p>
          <strong>국립핑계관리청장</strong>
        </div>
        <img
          src={`${import.meta.env.BASE_URL}brand/emblem.svg`}
          alt="국립핑계관리청 유예문장"
        />
      </div>
      <h2 className={s.sectionTitle}>기관 상징</h2>
      <div className={s.brandStory}>
        <img
          src={`${import.meta.env.BASE_URL}brand/logo-primary.svg`}
          alt="국립핑계관리청 가로형 로고"
        />
        <div>
          <h3>유예문장</h3>
          <p>
            직립한 문서의 실루엣과 비어 있는 결재칸을 기하학적으로 조합했습니다.
            균형 잡힌 사각 질서 속 한 칸의 여백은 잠시 유예된 판단을 상징합니다.
          </p>
        </div>
      </div>
      <h2 className={s.sectionTitle}>조직과 업무</h2>
      <div className={s.organization}>
        {[
          [
            "01",
            "민원접수국",
            "전자민원접수과",
            "민원 등록, 접수번호 발급, 접수증 관리",
          ],
          [
            "02",
            "생활사유심사국",
            "제1사유심사과",
            "사유의 구체성, 논리 및 유예 적정성 검토",
          ],
          [
            "03",
            "일상유예처분국",
            "유예결정과",
            "승인·조건부 승인·불승인 결정과 통지",
          ],
          [
            "04",
            "재심사조정실",
            "이의신청 심사",
            "새로운 소명에 따른 원처분 재검토",
          ],
          [
            "05",
            "전자문서관리실",
            "문서 발급 관리",
            "서식, 문서번호, 가상 관인 및 발급 이력",
          ],
        ].map(([n, title, sub, description]) => (
          <div key={n}>
            <span>{n}</span>
            <h3>{title}</h3>
            <strong>{sub}</strong>
            <p>{description}</p>
          </div>
        ))}
      </div>
      <h2 className={s.sectionTitle}>가상 운영규정</h2>
      <div className={s.regulations}>
        {[
          [
            "제1조 · 사유심사 운영규정",
            "모든 신청에는 접수번호를 부여하며, 사유의 구체성과 유예 적정성을 동일한 기준으로 검토한다. 동일 사건의 결정은 재발급 시 변경하지 않는다.",
          ],
          [
            "제2조 · 생활상 의무 유예 처리지침",
            "구체적인 수행 계획이 있는 단시간 유예를 우선 검토한다. 실제 외부의 의무나 기한을 변경하는 처분은 하지 않는다.",
          ],
          [
            "제3조 · 전자민원 서식 및 관인 관리세칙",
            "문서번호와 발급일을 사건별로 고정한다. 관인은 자체 제작한 가상 인영만 사용하며 모든 문서에 창작문서 표기를 둔다.",
          ],
        ].map(([title, description]) => (
          <section key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </section>
        ))}
      </div>
      <Notice>
        조직, 직위, 운영규정 및 기관장 명의는 모두 창작된 설정입니다. 실제
        국가기관과 관계가 없습니다.
      </Notice>
      <Button to="/services/defer">
        민원서비스 이용하기 <ArrowRight size={17} />
      </Button>
    </div>
  );
}
