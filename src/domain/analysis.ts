import {
  labels,
  type Application,
  type FactCode,
  type ReviewAnalysis,
  type ReviewFact,
  type ReviewPlan,
  type StatementSource,
} from "./types";

// A deliberately bounded language: each finding retains the applicant's words.
// No model, network request, word-count score, or random choice participates here.
export const ANALYSIS_VERSION = "sentence-rules/2.0" as const;
type Statement = { source: StatementSource; text: string };
type FactRule = { code: FactCode; pattern: RegExp };
export const factLabels: Record<FactCode, string> = {
  fatigue: "피로·기력 저하",
  sleep_loss: "수면 부족",
  health: "신체 불편",
  overload: "장시간 작업·집중 부담",
  rest: "휴식 희망",
  motivation: "착수 의욕 부족",
  leisure: "여가 활동 우선 희망",
  schedule: "다른 일정과의 중복",
  dependency: "외부 응답·자료 대기",
  technical: "기기·접속 장애",
  anxiety: "부담·집중 곤란",
  preparation_complete: "자료·준비 확보",
  in_progress: "작업 진행 중",
  nearly_complete: "마무리 단계",
  not_started: "착수 전",
  remaining_work: "남은 작업 식별",
  completed: "대상업무 완료 진술",
  recovered: "현재 상태 회복",
  block_resolved: "장애 해소 진술",
};
export const sourceLabels: Record<StatementSource | "selection", string> = {
  task: "해야 할 일",
  reason: "신청 사유",
  evidence: "부연 소명",
  supplement: "보완 소명",
  appeal: "이의신청",
  selection: "선택 항목",
};
export const causeCodes: FactCode[] = [
  "sleep_loss",
  "fatigue",
  "health",
  "overload",
  "dependency",
  "technical",
  "schedule",
  "anxiety",
  "motivation",
  "rest",
  "leisure",
];
const progressCodes: FactCode[] = [
  "preparation_complete",
  "in_progress",
  "nearly_complete",
  "remaining_work",
  "not_started",
  "completed",
];
const rules: FactRule[] = [
  {
    code: "fatigue",
    pattern:
      /피곤|피로(?:가\s*쌓|\s*누적|하|해|를\s*느|감)|졸리|졸려|지쳤|지쳐|지친|녹초|기진맥진|기운(?:이|도)?\s*(?:없|떨어)|체력(?:이|도)?\s*(?:바닥|떨어)|몸(?:이|도)?\s*(?:무겁|천근만근)/gu,
  },
  {
    code: "sleep_loss",
    pattern:
      /(?:잠|수면)(?:을|이|도|은)?\s*(?:제대로\s*)?(?:못\s*(?:잤|자)|부족|모자)|(?:밤을?\s*(?:새웠|샜|샌)|밤새\s*(?:일|공부|작업|깨어))|(?:한숨|두세?\s*시간|[1-4]\s*시간)(?:도|밖에|만)?\s*못?\s*잤/gu,
  },
  {
    code: "health",
    pattern:
      /(?:머리|배|허리|목|손목|어깨|몸)(?:가|이|도)?\s*(?:너무\s*)?(?:아프|아파|쑤시)|두통(?:이|으로|때문)|감기(?:에|가|기운)|몸살|열(?:이|도)\s*(?:나|있)|속(?:이|도)?\s*(?:안\s*좋|좋지\s*않)|어지럽|어지러워/gu,
  },
  {
    code: "overload",
    pattern:
      /(?:오전\s*내내|종일|하루\s*종일|몇\s*시간(?:째|\s*동안)|[2-9]\s*시간(?:째|\s*동안)?|계속|연속으로|쉬지\s*않고).{0,18}(?:작업|일했|공부|정리|집중|진행|작성)|(?:집중력|능률)(?:이|도)?\s*(?:떨어|바닥|한계)/gu,
  },
  {
    code: "rest",
    pattern:
      /(?:잠시|조금|좀|[0-9]+\s*분(?:만|간|동안)?)?\s*쉬(?:고\s*싶|어야|려|겠|고자|고\s*난\s*뒤|었다가|면)|휴식(?:을)?\s*(?:취|하|한|하고|하려|이\s*필요)|재충전|잠깐\s*(?:눈을\s*붙|숨을\s*돌)|(?:밥|식사)(?:을|를)?\s*(?:먹|하|한)/gu,
  },
  {
    code: "motivation",
    pattern:
      /의욕(?:이|도|은)?\s*(?:생기지\s*않|나지\s*않|없|부족|떨어|안\s*생|안\s*나)|(?:하기|시작하기|착수하기)(?:가|는|도)?\s*(?:너무\s*)?(?:싫|귀찮)|귀찮|하기\s*싫|손(?:이|을)?\s*(?:안\s*가|대기\s*싫)|미루고\s*싶|마음(?:이|을)?\s*(?:내키지\s*않|안\s*내키)/gu,
  },
  {
    code: "leisure",
    pattern:
      /(?:게임|유튜브|영상|넷플릭스|웹툰|드라마|SNS|인스타|쇼츠).{0,14}(?:하고\s*싶|보고\s*싶|보려|하려|부터|좀\s*하|하다가|보(?:다|고)\s*(?:나서|싶|이후)|한\s*판|더\s*(?:보|하))/giu,
  },
  {
    code: "schedule",
    pattern:
      /(?:회의|약속|수업|출장|병원|진료|면접|돌봄|육아|가족\s*일정)(?:이|가|에|을|를|으로|\s|때문).{0,18}(?:겹|있|잡|가야|참석|진행|다녀|돌봐|끝나|종료)|일정(?:이|가)?\s*(?:겹|중복)|(?:차|버스|지하철|열차)(?:가|이)?\s*(?:막|지연|끊)/gu,
  },
  {
    code: "dependency",
    pattern:
      /(?:답변|답장|회신|승인|자료|파일|확인|접근\s*권한)(?:을|를|이|가|도|은|는)?\s*(?:아직\s*)?(?:기다|받지\s*못|안\s*와|오지\s*않|도착하지\s*않|없어서)|(?:담당자|상대방|교수|팀원).{0,14}(?:연락|회신|답변|자료).{0,10}(?:대기|기다|없|않)|(?:자료|파일|권한)(?:이|가|을|를)?\s*(?:오기\s*전|와야|필요한데)/gu,
  },
  {
    code: "technical",
    pattern:
      /(?:인터넷|네트워크|서버|컴퓨터|노트북|프로그램|접속|로그인|전기)(?:이|가|을|를|에|도)?\s*(?:고장|오류|안\s*되|되지\s*않|끊|먹통|불가|중단)|정전|(?:접속|로그인)\s*오류/gu,
  },
  {
    code: "anxiety",
    pattern:
      /불안(?:하|해|해서|감)|막막(?:하|해)|압박(?:감|을)|부담(?:이|스러|돼|되어)|집중(?:이|을)?\s*(?:안\s*되|되지\s*않|못\s*하)|어디서부터\s*(?:시작|손).{0,8}(?:모르|막막)/gu,
  },
  {
    code: "preparation_complete",
    pattern:
      /(?:자료\s*조사|자료조사|자료|조사|준비|개요|목차)(?:는|를|을|가|이|도|까지)?\s*(?:모두|전부|다|이미)?\s*(?:찾았|모았|확보했|확보하였|끝냈|끝났|마쳤|마무리했|완료했|완료하였|완료됐|완료되었|돼\s*있|되어\s*있|해\s*뒀|해\s*놓았)/gu,
  },
  {
    code: "in_progress",
    pattern:
      /(?:본문|과제|보고서|청소|정리|답장|작업|운동)(?:을|를|는|이|도)?\s*(?:절반|반\s*정도|일부|[1-9][0-9]?\s*%).{0,8}(?:했|썼|작성|끝|진행)|(?:작성|정리|청소|작업|운동)(?:을|를)?\s*(?:진행\s*중|하고\s*있|하던\s*중)|(?:본문|문단|초안)(?:을|를)?\s*(?:쓰고\s*있|작성\s*중)/gu,
  },
  {
    code: "remaining_work",
    pattern:
      /(?:본문|보고서\s*작성|문제\s*풀이|답장|청소|정리)(?:만|이|가)?\s*(?:남았|남아)|(?:본문|보고서)(?:만)?\s*(?:쓰면|작성하면)/gu,
  },
  {
    code: "nearly_complete",
    pattern:
      /(?:검토|마무리|제출|수정|전송|한\s*문단|한\s*문장|조금|일부)(?:만|이|가)?\s*(?:남았|남아)|(?:검토|제출|수정)(?:만)?\s*하면|거의\s*(?:다\s*)?(?:끝|마쳤|완료)|(?:마지막|최종)\s*(?:검토|확인|단계)(?:만|가|에)?\s*(?:남|있)/gu,
  },
  {
    code: "not_started",
    pattern:
      /(?:아직\s*)?(?:시작|착수)(?:을|를|도|조차)?\s*(?:못\s*했|안\s*했|하지\s*않았|전)|(?:아무것|한\s*글자|한\s*줄)(?:도|을)?\s*(?:안\s*했|못\s*했|안\s*썼|쓰지\s*않았)/gu,
  },
  {
    code: "completed",
    pattern:
      /(?:과제|업무|보고서|청소|운동|답장)(?:는|를|을|이|도)?\s*(?:이미\s*)?(?:전부|모두|다)\s*(?:끝냈|마쳤|완료했|완료하였|보냈)/gu,
  },
  {
    code: "recovered",
    pattern:
      /(?:지금|현재|이제)(?:은|는)?\s*(?:몸(?:은|이)?\s*)?(?:괜찮|회복했|회복되|멀쩡|피곤하지\s*않)|(?:피로|두통|몸살|통증)(?:는|이|가)?\s*(?:풀렸|사라졌|나았)/gu,
  },
  {
    code: "block_resolved",
    pattern:
      /(?:기다리던\s*)?(?:자료|답변|회신|파일|권한)(?:는|을|를|이|가|도)?\s*(?:이제|방금|이미)?\s*(?:받았|도착했|왔|확보했|생겼)|(?:접속|로그인|인터넷|컴퓨터|서버|프로그램)(?:은|는|이|가)?\s*(?:이제\s*)?(?:복구됐|복구되었|해결됐|해결되었|정상화|정상으로)/gu,
  },
];

export function excerpt(text: string, max = 96): string {
  const clean = text.replace(/\s+/gu, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
function matchedExcerpt(text: string, index: number, max = 96): string {
  if (text.length <= max) return excerpt(text, max);
  const start = Math.max(0, index - 28);
  const end = Math.min(text.length, start + max - 2);
  return `${start ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}
function normalized(text: string): string {
  return text.normalize("NFKC").replace(/\r\n?/gu, "\n");
}
function analysisText(text: string): string {
  // Quoted examples, markup, and instructions remain literal in documents but
  // cannot become a personal factual assertion by matching a word inside them.
  return text.replace(
    /"[^"\n]*"|'[^'\n]*'|“[^”\n]*”|‘[^’\n]*’|「[^」\n]*」|<[^>]*>|https?:\/\/\S+/gu,
    " ",
  );
}
function clauses(statement: Statement): Statement[] {
  return analysisText(statement.text)
    .split(
      /[.!?。！？;\n]+|(?:지만|으나|그러나|하지만|그런데|반면에|대신에)\s*/u,
    )
    .map((text) => ({ source: statement.source, text: text.trim() }))
    .filter((s) => s.text.length > 0);
}
function nonAssertion(text: string): boolean {
  return (
    /(?:예를\s*들|예컨대|가령|만약|라고\s*(?:말|쓰|적|했)|라는\s*(?:예|문장)|승인(?:해\s*라|하라|해\s*줘)|규칙.{0,8}무시)/u.test(
      text,
    ) || /(?:피곤|아프|의욕|귀찮).{0,6}(?:하면|하다면|할\s*경우)/u.test(text)
  );
}
function negated(text: string, match: RegExpExecArray): boolean {
  const before = text.slice(0, match.index);
  const tail = text.slice(match.index + match[0].length);
  return (
    /(?:^|\s)(?:안|전혀\s*안)\s*$/u.test(before) ||
    /^(?:하?지(?:는|도)?\s*않|하?진\s*않|(?:한|하는|다는|는|은|인|을|할)?\s*(?:것|건|게|상태|뜻|이유)(?:은|는|이|가|도)?\s*아니|(?:이|가|은|는|도)?\s*(?:아님|아니|없(?:다|습니다|어요|음))|하지\s*말|(?:한|하는)\s*척|(?:다|었|았)?(?:다면|으면|을\s*경우))/u.test(
      tail,
    )
  );
}
function thirdPersonState(text: string): boolean {
  return (
    /(?:친구|동료|팀원|상대방|가족|그|그녀)(?:가|는|도)\s*(?:너무\s*)?(?:피곤|지쳐|아프|귀찮|의욕)/u.test(
      text,
    ) &&
    !/(?:나|저|본인)(?:는|도|는요|에게|의)?\s*(?:너무\s*)?(?:피곤|지쳐|아프|귀찮|의욕)/u.test(
      text,
    )
  );
}
function extractFacts(statements: Statement[]): ReviewFact[] {
  const facts: ReviewFact[] = [];
  const positions = new Map<ReviewFact, number>();
  const denials: { code: FactCode; position: number; text: string }[] = [];
  for (const [statementIndex, statement] of statements.entries()) {
    for (const [clauseIndex, clause] of clauses(statement).entries()) {
      if (nonAssertion(clause.text)) continue;
      for (const rule of rules) {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(clause.text))) {
          // A task phrased as "미루고 싶다" states the request, not its cause.
          if (
            statement.source === "task" &&
            rule.code === "motivation" &&
            /미루고\s*싶/u.test(match[0])
          )
            continue;
          const position =
            statementIndex * 1000000 + clauseIndex * 10000 + match.index;
          if (
            /^(?:다|었|았)?(?:다면|으면|을\s*경우)/u.test(
              clause.text.slice(match.index + match[0].length),
            )
          )
            continue;
          if (negated(clause.text, match)) {
            denials.push({ code: rule.code, position, text: clause.text });
            continue;
          }
          if (
            ["fatigue", "health", "motivation", "anxiety"].includes(
              rule.code,
            ) &&
            thirdPersonState(clause.text)
          )
            continue;
          const quote = matchedExcerpt(clause.text, match.index);
          if (
            !facts.some(
              (f) =>
                f.code === rule.code &&
                f.source === statement.source &&
                f.excerpt === quote,
            )
          ) {
            const fact = {
              code: rule.code,
              source: statement.source,
              excerpt: quote,
            };
            facts.push(fact);
            positions.set(fact, position);
          }
          break;
        }
      }
    }
  }
  const recovered = facts.find((f) => f.code === "recovered");
  const resolved = facts.filter((f) => f.code === "block_resolved");
  return facts
    .filter((f) => {
      if (
        denials.some(
          (d) =>
            d.code === f.code &&
            d.position > positions.get(f)! &&
            (!["dependency", "technical"].includes(f.code) ||
              /자료|파일/u.test(f.excerpt) === /자료|파일/u.test(d.text)),
        )
      )
        return false;
      if (
        recovered &&
        ["fatigue", "health"].includes(f.code) &&
        /(?:어제|아까|이전|전에는|지난)/u.test(f.excerpt)
      )
        return false;
      // A later supplement may explicitly replace the earlier unresolved state.
      if (
        ["dependency", "technical"].includes(f.code) &&
        resolved.some((r) => {
          const earlier =
            statements.findIndex((s) => s.source === r.source) >
              statements.findIndex((s) => s.source === f.source) ||
            (r.source === f.source && facts.indexOf(r) > facts.indexOf(f));
          const resources = [
            /자료|파일/u,
            /답변|회신|답장/u,
            /권한/u,
            /인터넷|네트워크/u,
            /접속|로그인/u,
            /컴퓨터|노트북/u,
            /서버/u,
            /프로그램/u,
          ];
          return (
            earlier &&
            resources.some(
              (pattern) => pattern.test(r.excerpt) && pattern.test(f.excerpt),
            )
          );
        })
      )
        return false;
      return true;
    })
    .slice(-24);
}

function koreanNumber(value: string): number {
  if (/^\d+$/u.test(value)) return Number(value);
  const native: Record<string, number> = {
    한: 1,
    하나: 1,
    두: 2,
    둘: 2,
    세: 3,
    셋: 3,
    네: 4,
    넷: 4,
    다섯: 5,
    여섯: 6,
    일곱: 7,
    여덟: 8,
    아홉: 9,
    열: 10,
    스무: 20,
    스물: 20,
    서른: 30,
    마흔: 40,
    쉰: 50,
  };
  if (native[value]) return native[value];
  for (const tens of ["열", "스물", "서른", "마흔", "쉰"]) {
    if (value.startsWith(tens) && native[value.slice(tens.length)])
      return native[tens] + native[value.slice(tens.length)];
  }
  const digits: Record<string, number> = {
    일: 1,
    이: 2,
    삼: 3,
    사: 4,
    오: 5,
    육: 6,
    칠: 7,
    팔: 8,
    구: 9,
  };
  if (/^[일이삼사오육칠팔구십]+$/u.test(value)) {
    const parts = value.split("십");
    return parts.length === 2
      ? (digits[parts[0]] ?? 1) * 10 + (digits[parts[1]] ?? 0)
      : (digits[value] ?? 0);
  }
  return 0;
}
const numberPattern =
  "(?:[0-9]{1,3}|열(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉)?|스물(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉)?|스무|서른|마흔|쉰|한|두|세|네|다섯|여섯|일곱|여덟|아홉|[일이삼사오육칠팔구십]+)";
function relativeTimes(
  text: string,
): { text: string; minutes: number; index: number; end: number }[] {
  const times: { text: string; minutes: number; index: number; end: number }[] =
    [];
  const pattern = new RegExp(
    `(${numberPattern})\\s*(시간|분)(?:\\s*(반|${numberPattern}\\s*분))?|반\\s*시간|하루`,
    "gu",
  );
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    let minutes =
      match[0] === "하루"
        ? 1440
        : /^반\s*시간$/u.test(match[0])
          ? 30
          : koreanNumber(match[1]) * (match[2] === "시간" ? 60 : 1);
    if (match[3] === "반") minutes += match[2] === "시간" ? 30 : 0.5;
    else if (match[3]) minutes += koreanNumber(match[3].replace(/\s*분$/u, ""));
    if (minutes > 0 && minutes <= 10080)
      times.push({
        text: match[0],
        minutes,
        index: match.index,
        end: pattern.lastIndex,
      });
  }
  return times;
}
export function relativeTime(text: string) {
  return relativeTimes(text)[0];
}
const actionRules: { pattern: RegExp; action: string }[] = [
  {
    pattern: /(?:개요|목차).{0,12}(?:작성|적|쓰|써|만들)/u,
    action: "대상 문서의 개요를 한 줄 작성할 것.",
  },
  {
    pattern:
      /(?:본문|첫\s*(?:번째\s*)?문단|첫\s*문장|초안).{0,14}(?:작성|적|쓰|써|착수|시작|수정)/u,
    action: "작성할 문서를 열고 본문의 첫 문장을 작성할 것.",
  },
  {
    pattern:
      /(?:답장|회신|메시지).{0,12}(?:쓰|써|작성|보내|전송)|(?:보내|전송).{0,5}(?:겠|할)/u,
    action: "답장할 대화방을 열고 전달할 내용을 한 문장 작성할 것.",
  },
  {
    pattern: /(?:서류|자료|파일).{0,14}(?:분류|정리)/u,
    action: "정리할 자료 하나를 골라 분류할 것.",
  },
  {
    pattern: /(?:자료|문헌).{0,14}(?:찾|검색|조사|읽)/u,
    action: "대상업무에 필요한 자료 한 건을 찾아 확인할 것.",
  },
  {
    pattern: /(?:설거지|접시|그릇).{0,12}(?:씻|닦|하)|설거지/u,
    action: "싱크대의 그릇 하나를 씻을 것.",
  },
  {
    pattern: /(?:방|책상|바닥|물건|쓰레기).{0,14}(?:치우|정리|닦|버리)|청소/u,
    action: "정리할 물건 하나를 골라 제자리에 둘 것.",
  },
  {
    pattern:
      /스트레칭|걷|산책|운동복|운동화|(?:운동|달리기|러닝).{0,12}(?:시작|착수|하|나가)/u,
    action: "운동할 준비를 갖추고 가벼운 준비 동작부터 시작할 것.",
  },
  {
    pattern: /(?:문제|첫\s*장|교재).{0,14}(?:풀|읽|펼)/u,
    action: "대상 교재를 열고 첫 문제 또는 첫 문단부터 확인할 것.",
  },
  {
    pattern: /(?:보고서|과제|문서).{0,14}(?:작성|쓰|써|수정|검토)/u,
    action: "대상 문서를 열고 작성 또는 수정할 첫 항목을 실행할 것.",
  },
  {
    pattern: /(?:파일|과제|보고서|문서).{0,12}제출/u,
    action: "제출할 파일을 확인하고 제출 화면을 열 것.",
  },
];
export function plannedAction(text: string): string | undefined {
  return actionRules
    .map((rule) => ({ action: rule.action, match: rule.pattern.exec(text) }))
    .filter((item) => item.match)
    .sort(
      (a, b) =>
        a.match!.index +
        a.match![0].length -
        (b.match!.index + b.match![0].length),
    )[0]?.action;
}
function planFrom(
  statement: Statement,
  input: Application,
): ReviewPlan | undefined {
  if (statement.source === "task") return undefined;
  const sentences = analysisText(statement.text)
    .split(/[.!?。！？;\n]+/u)
    .filter(Boolean);
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (nonAssertion(clean)) continue;
    if (
      /(?:계획|의사|생각)(?:이|은|도|는)?\s*(?:없|미정|안\s*정)|(?:계획|생각)\s*뿐|(?:할지|언제.{0,5}할지)(?:는|도)?\s*모르/u.test(
        clean,
      )
    )
      continue;
    const positive = clean.split(/(?:지만|으나|그러나|하지만)\s*/u).at(-1)!;
    const actionMatch =
      /작성|착수|시작|분류|정리|쓰|쓸|써|읽|풀|치우|닦|씻|꺼내|걷|스트레칭|운동|보내|전송|수정|검토|제출/gu;
    const matches = [...positive.matchAll(actionMatch)];
    const hasCommitment = matches.some((match) => {
      const tail = positive.slice(match.index! + match[0].length);
      const commitment =
        /겠|(?:할|칠|낼|쓸|읽을|풀|갈|을)\s*(?:예정|계획|겁|거|것)|할게|기로\s*(?:했|하였)|하려고\s*합|(?:하는|할)\s*(?:구체적인\s*)?(?:이행)?계획|할\s*구체적인/u.exec(
          tail,
        );
      if (!commitment) return false;
      const toCommitment = tail.slice(
        0,
        commitment.index + commitment[0].length,
      );
      return (
        !/(?:못\s*하|할\s*수\s*없|하지\s*않|안\s*하|않겠|없겠|싫|의사.{0,4}없)/u.test(
          toCommitment,
        ) && !/(?:안|못)\s*$/u.test(positive.slice(0, match.index))
      );
    });
    if (
      !hasCommitment ||
      /(?:시작|착수|작성|이행)(?:하|할)?\s*(?:지\s*않|수\s*없|못\s*하)/u.test(
        positive,
      )
    )
      continue;
    const time = relativeTimes(positive).find((candidate) =>
      /^\s*(?:(?:정도|가량|만|을|이)\s*)?(?:후|뒤|지나|안에|이내|간|동안|쉬|휴식|내에)/u.test(
        positive.slice(candidate.end),
      ),
    );
    const clock =
      /(?:(?:오늘|내일|모레)\s*)?(?:(?:오전|오후|저녁|밤)\s*)?\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?(?:부터|에|까지)/u.exec(
        positive,
      );
    const immediate =
      /(?:지금|즉시|바로)\s*(?:부터|다시|착수|시작|본문|첫|과제|보고서|작업|작성)/u.test(
        positive,
      );
    const afterRest =
      /(?:유예|휴식|쉬는\s*시간)(?:가|이)?\s*(?:끝|종료)|(?:쉬고|쉰|휴식한|휴식을\s*취한)\s*(?:뒤|후)|유예\s*(?:종료|후)/u.test(
        positive,
      );
    const contingent =
      /(?:답변|회신|자료|파일|권한|회의|수업|진료).{0,16}(?:오면|오는\s*대로|받으면|받는\s*대로|끝나면|종료되면|확보되면)/u.test(
        positive,
      );
    const timeIsActionable = Boolean(time);
    if (!timeIsActionable && !clock && !immediate && !afterRest && !contingent)
      continue;
    const fallback: Record<Application["taskCategory"], string> = {
      study: "대상 과제의 첫 항목을 열고 한 줄 작성할 것.",
      clean: "청소할 물건 하나를 골라 제자리에 둘 것.",
      exercise: "운동할 준비를 갖추고 준비 동작을 시작할 것.",
      reply: "답장할 대화방을 열고 첫 문장을 작성할 것.",
      organize: "정리할 대상 하나를 골라 분류할 것.",
      other: "신청서에 적은 대상업무의 첫 단계를 실행할 것.",
    };
    if (!plannedAction(positive) && !/(?:착수|시작)/u.test(positive)) continue;
    const futureDay =
      /(?:내일|모레|다음\s*주)\s*(?:(?:아침|오전|오후|저녁|밤)(?:에)?\s*)?(?:부터|에|은|는)?\s*(?:다시\s*)?(?:시작|착수|작성|쓰|\d|한\s*시간|열\s*분)/u.test(
        positive,
      );
    const timing = timeIsActionable
      ? `${futureDay ? "내일 이후 " : ""}${time!.text} 이내 첫 행동`
      : clock
        ? clock[0]
        : immediate
          ? "즉시 착수"
          : contingent
            ? "외부 대기 사유 해소 직후"
            : "신청한 유예 종료 직후";
    const actionText = time ? positive.slice(time.end) : positive;
    return {
      source: statement.source,
      excerpt: excerpt(positive, 160),
      action:
        plannedAction(actionText) ??
        plannedAction(positive) ??
        fallback[input.taskCategory],
      timing,
      ...(timeIsActionable
        ? { resumeWithinMinutes: time!.minutes }
        : afterRest
          ? { resumeWithinMinutes: input.requestedMinutes }
          : immediate
            ? { resumeWithinMinutes: 0 }
            : {}),
      sameDay:
        !futureDay &&
        Boolean(
          immediate ||
            (timeIsActionable && time!.minutes < 1440) ||
            (/오늘/u.test(positive) && clock),
        ),
      laterDay: futureDay,
      contingent,
    };
  }
  return undefined;
}

type DeadlineClaim = ReviewAnalysis["deadline"];
function deadlineClaims(statements: Statement[]): DeadlineClaim[] {
  const claims: DeadlineClaim[] = [];
  for (const statement of statements) {
    for (const clause of clauses(statement)) {
      // Separate the deadline from a wish to postpone or a quoted example.
      const text = clause.text;
      if (nonAssertion(text)) continue;
      if (
        /(?:마감|기한).{0,16}(?:인지\s*(?:모르|불명|확인)|이?라면|이면|없지\s*않)|(?:아마|어쩌면).{0,12}(?:마감|기한)/u.test(
          text,
        )
      )
        continue;
      const negativeToday =
        /오늘(?:이|은|는)?\s*(?:마감|기한)(?:이|은|는)?\s*아니|(?:마감|기한)(?:은|이)?\s*오늘(?:이|은|는)?\s*아니/u.test(
          text,
        );
      const today =
        !negativeToday &&
        /(?:오늘|금일|오늘\s*밤|오늘\s*자정).{0,12}(?:마감|기한|까지\s*(?:제출|내야|완료|보내))|(?:마감|기한)(?:은|이|:)?\s*(?:오늘|금일)/u.test(
          text,
        );
      const later =
        /(?:내일|모레|다음\s*주|다음\s*날).{0,10}(?:마감|기한|까지\s*(?:제출|내|완료|보내))|(?:마감|기한)(?:은|이|:)?\s*(?:내일|모레|다음\s*주)/u.test(
          text,
        );
      const none =
        /(?:마감|기한)(?:은|이|도|:)?\s*(?:따로\s*|정해진\s*)?없|(?:마감|기한)(?:을|를)?\s*정하지\s*않|기한\s*없는\s*(?:일|업무|정리)/u.test(
          text,
        );
      for (const [found, value] of [
        [today, "today"],
        [later, "later"],
        [none, "none"],
      ] as const) {
        if (found)
          claims.push({
            value,
            source: statement.source,
            excerpt: excerpt(text, 100),
          });
      }
    }
  }
  return claims;
}
export function analyzeApplication(
  input: Application,
  supplement?: string,
  appeal?: string,
): ReviewAnalysis {
  const statements = (
    [
      { source: "task", text: normalized(input.taskDescription) },
      { source: "reason", text: normalized(input.reasonDetail) },
      { source: "evidence", text: normalized(input.evidenceDetail) },
      ...(supplement
        ? [{ source: "supplement" as const, text: normalized(supplement) }]
        : []),
      ...(appeal
        ? [{ source: "appeal" as const, text: normalized(appeal) }]
        : []),
    ] satisfies Statement[]
  ).filter((s) => s.text.trim());
  const facts = extractFacts(statements);
  const plans = statements
    .map((s) => planFrom(s, input))
    .filter((p): p is ReviewPlan => Boolean(p));
  const plan = plans.at(-1);
  const claims = deadlineClaims(statements);
  const latest = claims.at(-1);
  let deadline: ReviewAnalysis["deadline"] = {
    value: input.deadlineCategory,
    source: "selection",
  };
  const issues: ReviewAnalysis["issues"] = [];
  const correction =
    latest &&
    ["supplement", "appeal"].includes(latest.source) &&
    /정정|변경|연장|확인\s*결과|확인해\s*보니|실제\s*(?:마감|기한)/u.test(
      latest.excerpt ?? "",
    );
  const relevantClaims = correction
    ? claims.filter((c) => c.source === latest.source)
    : claims;
  const values = new Set(relevantClaims.map((c) => c.value));
  const contradiction =
    values.size > 1 ||
    Boolean(
      latest &&
        input.deadlineCategory !== "unknown" &&
        latest.value !== input.deadlineCategory &&
        !correction,
    );
  if (contradiction) {
    issues.push({
      code: "deadline_conflict",
      question: `선택한 마감기한 '${labels.deadline[input.deadlineCategory]}'과 본문의 기한 진술${latest?.excerpt ? ` “${latest.excerpt}”` : ""}이 일치하지 않음. 실제 기한과 정정할 항목을 밝혀 주시기 바람.`,
    });
  } else if (
    latest &&
    (input.deadlineCategory === "unknown" ||
      correction ||
      latest.value === input.deadlineCategory)
  ) {
    deadline = latest;
  }
  if (!contradiction && deadline.value === "unknown")
    issues.push({
      code: "deadline_unknown",
      question:
        "실제 마감이 오늘인지, 내일 이후인지, 정해진 기한이 없는지 확인하여 제출해 주시기 바람.",
    });
  const hasReason =
    facts.some((f) => causeCodes.includes(f.code)) || Boolean(plan);
  if (!hasReason)
    issues.push({
      code: "reason_unclear",
      question: `“${excerpt(input.taskDescription, 70)}”의 착수를 미루어야 하는 사정과 ${labels.minutes[input.requestedMinutes]}이 필요한 이유를 구체적으로 밝혀 주시기 바람.`,
    });
  if (plan?.laterDay && input.requestedMinutes < 1440) {
    issues.push({
      code: "plan_duration",
      question: `희망 유예는 ${labels.minutes[input.requestedMinutes]}이나 복귀 계획은 내일 이후로 기재됨. 필요한 시간과 실제 첫 행동 시점을 맞추어 소명해 주시기 바람.`,
    });
  } else if (
    plan?.resumeWithinMinutes !== undefined &&
    plan.resumeWithinMinutes > input.requestedMinutes
  ) {
    issues.push({
      code: "plan_duration",
      question: `희망 유예는 ${labels.minutes[input.requestedMinutes]}이나 제출한 복귀 계획은 ${plan.resumeWithinMinutes}분 뒤를 기준으로 함. 필요한 시간과 실제 첫 행동 시점을 맞추어 소명해 주시기 바람.`,
    });
  }
  if (
    facts.some((f) => f.code === "completed") &&
    !facts.some((f) => ["nearly_complete", "remaining_work"].includes(f.code))
  ) {
    issues.push({
      code: "already_completed",
      question:
        "대상업무를 모두 마쳤다는 진술이 있음. 완료한 업무와 별도로 유예가 필요한 남은 작업이 무엇인지 구분해 주시기 바람.",
    });
  }
  return {
    version: ANALYSIS_VERSION,
    facts,
    ...(plan ? { plan } : {}),
    deadline,
    issues,
  };
}
export function mainCause(analysis: ReviewAnalysis): ReviewFact | undefined {
  const statedCauses = analysis.facts.filter((f) =>
    causeCodes.includes(f.code),
  );
  const candidates = statedCauses.some((f) => f.source !== "task")
    ? statedCauses.filter((f) => f.source !== "task")
    : statedCauses;
  return causeCodes
    .map((code) => [...candidates].reverse().find((f) => f.code === code))
    .find(Boolean);
}
export function mainProgress(analysis: ReviewAnalysis): ReviewFact | undefined {
  return [
    "remaining_work",
    "nearly_complete",
    "preparation_complete",
    "in_progress",
    "not_started",
    "completed",
  ]
    .map((code) => analysis.facts.find((f) => f.code === code))
    .find(Boolean);
}
export function pendingBlock(analysis: ReviewAnalysis): boolean {
  return (
    analysis.facts.some((f) => ["dependency", "technical"].includes(f.code)) ||
    Boolean(analysis.plan?.contingent)
  );
}
export function isProgressFact(code: FactCode): boolean {
  return progressCodes.includes(code);
}
