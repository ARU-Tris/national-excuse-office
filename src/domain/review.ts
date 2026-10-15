import { type Application, type Decision, labels } from "./types";
export const ENGINE_VERSION = "review-engine/1.0" as const;
const topic = (word: string) =>
  word + ((word.charCodeAt(word.length - 1) - 0xac00) % 28 ? "은" : "는");
export const firstActions: Record<Application["taskCategory"], string> = {
  study: "과제 안내문을 열고 첫 번째 요구사항을 한 줄로 적을 것.",
  clean: "책상 위 물건 하나를 제자리에 둘 것.",
  exercise: "운동복을 꺼내어 눈에 보이는 곳에 둘 것.",
  reply: "답장할 대화방을 열고 첫 문장을 작성할 것.",
  organize: "정리할 물건 하나를 정해 눈앞에 둘 것.",
  other: "해야 할 일의 첫 번째 행동을 한 줄로 적을 것.",
};
export function reviewApplication(
  input: Application,
  now: string,
  supplement?: string,
): Decision {
  const detail = [input.reasonDetail, input.evidenceDetail, supplement ?? ""]
    .filter(Boolean)
    .join(" ");
  const compact = detail.replace(/\s/g, "");
  const concrete = compact.length >= 35;
  const recognizableMotivation =
    input.reasonCategory === "motivation" &&
    /의욕|하기.?싫|시작|귀찮/u.test(detail);
  const insufficient =
    input.deadlineCategory === "unknown" ||
    (compact.length < 12 && !recognizableMotivation);
  const clash =
    input.deadlineCategory === "today" && input.requestedMinutes === 1440;
  const short = input.requestedMinutes <= 30;
  let outcome: Decision["outcome"];
  let rationale: string[];
  const conditions: string[] = [];
  if (insufficient && !supplement) {
    outcome = "supplement_requested";
    rationale = [
      ...(input.deadlineCategory === "unknown"
        ? [
            "실제 마감기한이 불명확하여 요청한 유예시간과의 충돌 여부를 판단하기 어려움.",
          ]
        : []),
      ...(compact.length < 12
        ? [
            "제출 사유만으로는 유예의 필요성과 유예 종료 후 이행 가능성을 판단하기 어려움.",
          ]
        : []),
      "마감기한에 관한 정황 및 유예시간 산정 근거를 추가 텍스트 소명으로 1회 제출하여 주시기 바람.",
    ];
  } else if (clash && input.reviewMode === "strict") {
    outcome = "rejected";
    rationale = [
      `신청인이 주장한 ${topic(labels.reason[input.reasonCategory])} 충분히 발생 가능한 사정으로 인정됨.`,
      "다만, 오늘의 마감기한과 하루 유예 요청이 충돌하며, 익일의 자발적 착수 가능성만으로 이를 해소할 구체적 근거가 충분하지 않음.",
      "이에 따라 생활상 의무 유예 처리지침 제3조에 의하여 신청을 불승인함.",
    ];
  } else if (supplement && insufficient && !concrete) {
    outcome = "rejected";
    rationale = [
      "보완 제출에 대한 검토를 완료하였으나, 유예의 필요성과 이행 가능성에 대한 판단정보가 여전히 충분하지 않음.",
      "보완은 1회로 종결하며 사유심사 운영규정 제4조에 따라 신청을 불승인함.",
    ];
  } else if (input.deadlineCategory === "none" && short && concrete) {
    outcome = "approved";
    rationale = [
      "실제 마감기한의 제한이 없고, 요청한 유예시간이 단시간으로 확인됨.",
      "제출 사유 및 유예 종료 후 업무 수행 계획의 구체성을 고려하여 생활상 의무 유예 처리지침 제2조에 따라 신청을 승인함.",
    ];
  } else {
    outcome = "conditional";
    rationale = [
      `신청인의 ${labels.reason[input.reasonCategory]} 및 일시적 부담을 고려하여 ${labels.minutes[input.requestedMinutes]}의 착수 준비시간을 조건부로 인정함.`,
      clash
        ? "관대한 심사에 따라 개인적 착수 계획의 조정을 인정하되, 실제 마감기한의 변경이나 제3자의 승인을 의미하지 않음."
        : "제출된 정황만으로 무조건적 유예를 인정하기 어려워 이행조건을 부가함.",
    ];
    conditions.push(
      `유예시간 ${labels.minutes[input.requestedMinutes]} 경과 후 권고한 첫 번째 행동을 수행할 것.`,
    );
    if (input.deadlineCategory === "unknown")
      conditions.push(
        "실제 마감기한을 확인한 뒤 이에 맞추어 수행계획을 조정할 것.",
      );
  }
  const factualFindings = [
    `신청인은 ${labels.category[input.taskCategory]}에 관하여 ${labels.minutes[input.requestedMinutes]}의 유예를 요청함.`,
    `실제 마감기한은 '${labels.deadline[input.deadlineCategory]}'으로 제출되었으며, ${labels.mode[input.reviewMode]}를 적용함.`,
    ...(supplement ? ["보완자료 1회 제출이 확인됨."] : []),
  ];
  return {
    outcome,
    decidedAtISO: now,
    engineVersion: ENGINE_VERSION,
    factualFindings,
    rationale,
    conditions,
    firstAction: firstActions[input.taskCategory],
    checks: [
      {
        label: "사유 구체성",
        finding: concrete
          ? "유예가 필요한 정황과 수행 의사를 구체적으로 소명함."
          : "사유의 해소 시점과 이행 가능성의 구체성이 제한적임.",
      },
      {
        label: "유예 적정성",
        finding: clash
          ? "오늘 마감과 하루 유예 사이의 충돌이 확인됨."
          : `희망 유예 ${labels.minutes[input.requestedMinutes]}와 마감 '${labels.deadline[input.deadlineCategory]}'을 비교 검토함.`,
      },
      {
        label: "종합 의견",
        finding: `${labels.mode[input.reviewMode]}에 따라 '${labels.outcome[outcome]}'으로 결정함.`,
      },
    ],
  };
}
export function reviewAppeal(
  input: Application,
  original: Decision,
  reason: string,
  now: string,
): Decision {
  const concrete = reason.replace(/\s/g, "").length >= 45;
  const changed =
    concrete &&
    /(계획|확인|착수|분|시간|완료|일정|진행|변경|기한)/u.test(reason);
  return {
    ...original,
    decidedAtISO: now,
    outcome: changed ? "conditional" : "rejected",
    factualFindings: [
      ...original.factualFindings,
      "불승인 처분에 대한 1회 이의신청 및 추가 소명 접수를 확인함.",
    ],
    rationale: changed
      ? [
          "새롭게 제출된 이행계획이 최초 심사 당시의 사실관계를 보완한 것으로 인정됨.",
          "구체적 착수 계획을 조건으로 원처분을 조건부 승인으로 변경함. 실제 외부 의무나 기한은 변경되지 않음.",
        ]
      : [
          "추가 제출된 사유는 최초 판단의 일부 사실관계를 보완하였으나, 원처분을 변경할 정도의 구체적인 이행계획과 상당성은 인정하기 어려움.",
          "재심사조정실의 검토 결과, 원처분인 불승인을 유지하며 본 사건의 이의신청 절차를 종결함.",
        ],
    conditions: changed
      ? [
          `희망 유예시간 ${labels.minutes[input.requestedMinutes]} 경과 후 제출한 이행계획에 따라 첫 행동을 수행할 것.`,
        ]
      : [],
    checks: [
      ...original.checks.slice(0, 2),
      {
        label: "재심사 의견",
        finding: changed
          ? "새로운 이행계획 확인 · 원처분 변경"
          : "새로운 판단 근거 부족 · 원처분 유지",
      },
    ],
  };
}
