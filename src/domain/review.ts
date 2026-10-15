import {
  type Application,
  type Decision,
  type ReviewAnalysis,
  type ReviewFact,
  labels,
} from "./types";
import {
  analyzeApplication,
  excerpt,
  factLabels,
  isProgressFact,
  mainCause,
  mainProgress,
  pendingBlock,
  sourceLabels,
} from "./analysis";

export const ENGINE_VERSION = "review-engine/2.0" as const;
export const firstActions: Record<Application["taskCategory"], string> = {
  study: "과제 안내문을 열고 첫 번째 요구사항을 한 줄로 적을 것.",
  clean: "책상 위 물건 하나를 제자리에 둘 것.",
  exercise: "운동복을 꺼내어 눈에 보이는 곳에 둘 것.",
  reply: "답장할 대화방을 열고 첫 문장을 작성할 것.",
  organize: "정리할 물건 하나를 정해 눈앞에 둘 것.",
  other: "해야 할 일의 첫 번째 행동을 한 줄로 적을 것.",
};
function firstAction(input: Application, analysis: ReviewAnalysis): string {
  if (analysis.plan) return analysis.plan.action;
  if (pendingBlock(analysis))
    return "대기 중인 응답·자료 또는 접속 상태를 확인하고, 외부 응답 없이 할 수 있는 준비 항목 하나를 적을 것.";
  const progress = mainProgress(analysis);
  if (
    progress?.code === "preparation_complete" &&
    input.taskCategory === "study"
  )
    return "확보한 자료를 옆에 두고 대상 문서의 본문 첫 문장을 작성할 것.";
  if (progress?.code === "remaining_work" && /본문/u.test(progress.excerpt))
    return "남았다고 기재한 본문의 첫 문장을 작성할 것.";
  if (progress && ["nearly_complete", "remaining_work"].includes(progress.code))
    return "남았다고 기재한 작업 중 첫 항목을 열고 처리할 부분 하나를 실행할 것.";
  if (progress?.code === "in_progress")
    return "진행 중인 작업을 열고 마지막으로 수행한 지점 다음 항목부터 이어갈 것.";
  return firstActions[input.taskCategory];
}
function factObservation(fact: ReviewFact): string {
  const quote = `“${excerpt(fact.excerpt, 78)}”`;
  switch (fact.code) {
    case "preparation_complete":
      return `${quote}라는 진술에 따라 자료 확보 또는 준비 단계는 마친 것으로 기재되어 있음.`;
    case "remaining_work":
      return `${quote}라고 기재하여 남은 대상업무를 특정한 진술로 검토함.`;
    case "nearly_complete":
      return `${quote}라고 기재하여 전체 업무보다는 남은 작성·마무리 단계의 착수 문제로 파악됨.`;
    case "in_progress":
      return `${quote}라고 기재하여 이미 진행한 작업을 이어가는 데 필요한 유예로 검토함.`;
    case "not_started":
      return `${quote}라고 기재하여 대상업무는 아직 착수 전인 것으로 진술함.`;
    case "sleep_loss":
      return `${quote}라는 수면 부족 정황이 제출되어 일시적인 수행 부담을 고려함.`;
    case "fatigue":
      return `${quote}라는 피로·기력 저하 정황을 유예 필요성의 근거로 제출함.`;
    case "health":
      return `${quote}라는 신체 불편을 호소하여 현재 작업 수행의 부담을 소명함.`;
    case "overload":
      return `${quote}라고 기재하여 지속적인 작업에 따른 집중·휴식 부담을 소명함.`;
    case "dependency":
      return `${quote}라고 기재하여 외부 응답 또는 자료 확보에 따라 다음 작업의 착수 가능성이 달라지는 사정이 있음.`;
    case "technical":
      return `${quote}라는 기기·접속 장애를 기재하여 의욕과 별개로 작업 환경의 제약을 소명함.`;
    case "schedule":
      return `${quote}라는 다른 일정과의 중복을 기재함. 일정이 끝난 뒤 복귀할 수 있는지를 함께 검토함.`;
    case "anxiety":
      return `${quote}라는 부담·집중 곤란을 기재함. 업무를 작은 첫 행동으로 나누는 방안을 검토함.`;
    case "motivation":
      return `${quote}라는 착수 의욕 부족을 기재함. 해당 심정만으로 장시간 유예가 필요한 사정까지 확인되지는 않음.`;
    case "leisure":
      return `${quote}라는 여가 활동 우선 희망을 기재함. 이를 업무 착수를 제한하는 불가피한 장애와 동일하게 보기는 어려움.`;
    default:
      return `${quote}라는 ${factLabels[fact.code]}이 제출됨.`;
  }
}
function observation(analysis: ReviewAnalysis): string | undefined {
  const progress = mainProgress(analysis);
  const cause = mainCause(analysis);
  return (
    [progress, cause]
      .filter((f): f is ReviewFact => Boolean(f))
      .map(factObservation)
      .join(" ") || undefined
  );
}
function planObservation(analysis: ReviewAnalysis): string {
  if (!analysis.plan)
    return "유예가 끝난 뒤 언제, 어떤 행동으로 복귀할지는 구체적으로 기재되지 않아 첫 행동의 이행조건을 부가함.";
  return `“${analysis.plan.excerpt}”라는 계획에서 복귀 계기와 첫 행동을 함께 제시함.${analysis.plan.contingent ? " 다만 외부 대기 사유가 해소되어야 실행할 수 있는 계획으로 검토함." : ""}`;
}
function timeFinding(input: Application, analysis: ReviewAnalysis): string {
  if (analysis.issues.some((issue) => issue.code === "deadline_conflict"))
    return analysis.issues.find((issue) => issue.code === "deadline_conflict")!
      .question;
  const effective = labels.deadline[analysis.deadline.value];
  const fromText =
    analysis.deadline.source !== "selection" &&
    input.deadlineCategory !== analysis.deadline.value;
  return `${fromText ? `${sourceLabels[analysis.deadline.source]}의 “${analysis.deadline.excerpt}”라는 진술에 따라` : "선택한 항목에 따라"} 마감기한을 '${effective}'으로 검토함. 희망 유예는 ${labels.minutes[input.requestedMinutes]}임.`;
}
function checks(
  input: Application,
  analysis: ReviewAnalysis,
  outcome: Decision["outcome"],
): Decision["checks"] {
  const progress = mainProgress(analysis),
    cause = mainCause(analysis);
  return [
    {
      label: "업무 진행 상태",
      finding: progress
        ? `${factLabels[progress.code]} · “${progress.excerpt}”`
        : "완료·진행 정도를 특정하는 진술은 확인되지 않음.",
    },
    {
      label: "착수 장애·사유",
      finding: cause
        ? `${factLabels[cause.code]} · “${cause.excerpt}”`
        : "유예가 필요한 사정이 충분히 특정되지 않음.",
    },
    {
      label: "복귀 가능성",
      finding: analysis.plan
        ? `“${analysis.plan.excerpt}”${analysis.plan.contingent ? " · 외부 사유 해소 조건부" : ""}`
        : "복귀 시점과 구체적 첫 행동을 함께 제시한 계획은 확인되지 않음.",
    },
    { label: "유예·기한 비교", finding: timeFinding(input, analysis) },
    {
      label: "종합 의견",
      finding: `${labels.mode[input.reviewMode]}에 따라 '${labels.outcome[outcome]}'으로 결정함.`,
    },
  ];
}
function findings(
  input: Application,
  analysis: ReviewAnalysis,
  supplement?: string,
): string[] {
  return [
    `신청인은 “${input.taskDescription}”에 관하여 ${labels.minutes[input.requestedMinutes]}의 유예를 요청함.`,
    timeFinding(input, analysis),
    ...analysis.facts
      .slice(0, 6)
      .map(
        (f) =>
          `${sourceLabels[f.source]} · ${factLabels[f.code]}: “${f.excerpt}”`,
      ),
    ...(analysis.plan
      ? [
          `${sourceLabels[analysis.plan.source]}의 복귀 계획: “${analysis.plan.excerpt}”`,
        ]
      : []),
    ...(supplement
      ? [
          "보완자료 1회 제출을 반영함. 최초 신청서와 보완요구서는 원래 내용대로 보존함.",
        ]
      : []),
  ];
}
export function reviewApplication(
  input: Application,
  now: string,
  supplement?: string,
): Decision {
  const analysis = analyzeApplication(input, supplement);
  const clash =
    analysis.deadline.value === "today" && input.requestedMinutes === 1440;
  const context =
    [
      observation(analysis),
      analysis.deadline.source !== "selection" &&
      input.deadlineCategory !== analysis.deadline.value
        ? timeFinding(input, analysis)
        : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const plan = analysis.plan;
  const blocking = pendingBlock(analysis);
  const cause = mainCause(analysis);
  const onlyPreference =
    cause && ["motivation", "leisure"].includes(cause.code);
  let outcome: Decision["outcome"];
  let rationale: string[];
  const conditions: string[] = [];
  const action = firstAction(input, analysis);
  if (analysis.issues.length) {
    outcome = supplement ? "rejected" : "supplement_requested";
    rationale = [
      ...(context ? [context] : []),
      ...analysis.issues.map((issue) => issue.question),
      supplement
        ? "보완자료를 검토하였으나 위 판단정보가 해소되지 않음. 보완은 1회로 종결하며 사유심사 운영규정 제4조에 따라 신청을 불승인함."
        : "위 사항을 추가 텍스트 소명으로 1회 제출하여 주시기 바람. 문장의 길이보다 실제 사정과 실행 가능한 복귀 계획을 기준으로 재검토함.",
    ];
  } else if (clash && input.reviewMode === "strict") {
    outcome = "rejected";
    rationale = [
      ...(context ? [context] : []),
      "오늘의 마감기한과 하루 유예 요청이 충돌함. 익일의 자발적 착수 의사만으로 오늘 이행해야 하는 업무의 기한을 넘길 근거가 되기는 어려움.",
      plan
        ? `제출한 계획 “${plan.excerpt}”은 확인하였으나, 신청한 하루 전체의 유예와 오늘 마감의 충돌은 해소하지 못함. 실제 필요한 준비시간으로 요청 범위를 조정할 필요가 있음.`
        : blocking
          ? "외부 응답 또는 작업 환경의 제약은 고려하였으나, 해당 사정으로 실제 마감기한이 연장되었다는 진술이나 대체 수행계획은 확인되지 않음."
          : "유예 종료 후의 구체적인 복귀 시점과 첫 행동도 제시되지 않아, 장시간 유예 후 이행 가능성을 인정할 근거가 부족함.",
      "이에 따라 생활상 의무 유예 처리지침 제3조에 의하여 신청을 불승인함.",
    ];
  } else if (
    input.reviewMode === "strict" &&
    input.requestedMinutes > 30 &&
    onlyPreference &&
    !plan
  ) {
    outcome = "rejected";
    rationale = [
      context!,
      mainProgress(analysis)?.code === "preparation_complete"
        ? "준비 단계가 끝났다는 진술에 비추어 남은 작성에 착수할 수 없는 별도의 장애나 장시간 대기의 필요성은 제출 내용에서 확인되지 않음."
        : `요청한 ${labels.minutes[input.requestedMinutes]}이 필요한 구체적 제약과 유예 종료 후의 실행계획이 제시되지 않음.`,
      "짧은 착수 준비와 업무 전체의 장시간 유예를 구별할 필요가 있어 생활상 의무 유예 처리지침 제3조에 따라 신청을 불승인함.",
    ];
  } else if (
    analysis.deadline.value === "none" &&
    input.requestedMinutes <= 30 &&
    plan &&
    cause &&
    !blocking &&
    !onlyPreference
  ) {
    outcome = "approved";
    rationale = [
      ...(context ? [context] : []),
      planObservation(analysis),
      `정해진 마감기한이 없고 요청한 ${labels.minutes[input.requestedMinutes]} 범위의 복귀 계획이 제시되어, 휴식·준비와 대상업무 이행을 양립할 수 있는 단시간 유예로 판단함.`,
      "생활상 의무 유예 처리지침 제2조에 따라 신청을 승인함.",
    ];
  } else {
    outcome = "conditional";
    rationale = [
      ...(context ? [context] : []),
      planObservation(analysis),
      clash
        ? "관대한 심사에 따라 착수 준비의 필요성을 일부 인정하되, 실제 마감기한 전에 첫 행동을 이행하는 범위로 조건을 부가함. 하루 요청이 실제 마감기한의 변경이나 제3자의 승인을 의미하지 않음."
        : blocking
          ? "외부 대기 사유의 종료 시점은 확정되지 않아 무조건적 유예보다는 상태 확인과 가능한 준비 작업을 조건으로 인정함."
          : `요청한 ${labels.minutes[input.requestedMinutes]}을 착수 준비시간으로 검토하되, 실제 복귀가 이루어지도록 아래 이행조건을 부가하여 조건부 승인함.`,
    ];
    conditions.push(
      clash
        ? `실제 마감기한을 넘기지 않는 범위에서 준비를 마치고 ${action}`
        : blocking
          ? `유예시간 ${labels.minutes[input.requestedMinutes]} 이내에 대기·장애 상태를 다시 확인하고, 가능한 준비 작업부터 수행할 것. 외부 사유가 해소되면 제출한 계획에 따라 복귀할 것.`
          : `유예시간 ${labels.minutes[input.requestedMinutes]} 경과 후 ${action}`,
    );
  }
  return {
    outcome,
    decidedAtISO: now,
    engineVersion: ENGINE_VERSION,
    analysis,
    ...(["approved", "conditional"].includes(outcome)
      ? {
          approvedScope: clash
            ? "실제 마감기한 전 복귀를 조건으로 하는 착수 준비시간"
            : `개인적 업무의 착수 준비시간 ${labels.minutes[input.requestedMinutes]}${blocking ? " · 외부 대기·장애 상태 확인 조건" : ""}`,
        }
      : {}),
    factualFindings: findings(input, analysis, supplement),
    rationale,
    conditions,
    firstAction: action,
    checks: checks(input, analysis, outcome),
  };
}
export function reviewAppeal(
  input: Application,
  original: Decision,
  reason: string,
  now: string,
  supplement?: string,
): Decision {
  const before = original.analysis ?? analyzeApplication(input, supplement);
  const analysis = analyzeApplication(input, supplement, reason);
  const plan = analysis.plan?.source === "appeal" ? analysis.plan : undefined;
  const newFacts = analysis.facts.filter(
    (f) =>
      f.source === "appeal" &&
      !before.facts.some((previous) => previous.code === f.code),
  );
  const newPlan = Boolean(
    plan &&
      (!before.plan ||
        plan.action !== before.plan.action ||
        plan.resumeWithinMinutes !== before.plan.resumeWithinMinutes ||
        plan.contingent !== before.plan.contingent),
  );
  const resolvedDeadline =
    before.deadline.value !== analysis.deadline.value &&
    analysis.deadline.value !== "unknown";
  const actionable = Boolean(
    plan && !plan.contingent && !pendingBlock(analysis),
  );
  const clash =
    analysis.deadline.value === "today" && input.requestedMinutes === 1440;
  const boundedTodayPlan = Boolean(
    plan &&
      plan.sameDay &&
      plan.resumeWithinMinutes !== undefined &&
      plan.resumeWithinMinutes <= 30,
  );
  const tooLate = analysis.deadline.value === "today" && plan?.laterDay;
  const changed =
    actionable &&
    !tooLate &&
    !analysis.issues.length &&
    (newPlan ||
      newFacts.some(
        (f) => isProgressFact(f.code) || f.code === "block_resolved",
      ) ||
      resolvedDeadline) &&
    (!clash || boundedTodayPlan);
  const outcome = changed ? "conditional" : "rejected";
  const context = observation({
    ...analysis,
    facts: analysis.facts.filter((f) => f.source === "appeal"),
  });
  const rationale = [
    ...(context ? [context] : []),
    ...(changed
      ? [
          `추가 소명에서 “${excerpt(plan!.excerpt, 100)}”로 ${newPlan ? "복귀 시점과 첫 행동을 새로 제시함." : "추가 사실에 맞춘 실행계획을 제시함."} 최초에 부족했던 이행 가능성을 보완함.`,
          clash
            ? `오늘 마감과 하루 유예는 여전히 충돌하므로 하루 전체는 인정하지 않음. ${plan!.resumeWithinMinutes}분 이내 착수를 조건으로 원처분을 조건부 승인으로 변경함. 실제 마감기한은 유지됨.`
            : "추가 소명을 반영하여 제출한 복귀 계획의 이행을 조건으로 원처분을 조건부 승인으로 변경함. 실제 외부 의무나 기한은 변경되지 않음.",
        ]
      : [
          ...analysis.issues.map((issue) => issue.question),
          !plan
            ? "이의신청에서 복귀 시점과 첫 행동을 함께 특정한 새로운 실행계획은 확인되지 않음. 계획·시간·완료 등의 단어 또는 같은 사유의 반복만으로 원처분을 변경할 근거가 되지는 않음."
            : !newPlan && !newFacts.length && !resolvedDeadline
              ? "제출한 계획은 최초 심사 내용의 반복으로 확인되며, 원처분의 판단을 달리할 새로운 진행 상태나 복귀 계획은 확인되지 않음."
              : clash && !boundedTodayPlan
                ? "추가 계획도 오늘 마감과 하루 유예의 충돌을 해소하지 못함. 오늘 안의 짧고 구체적인 착수 시점이 필요함."
                : "추가 계획에 남은 대기 조건 또는 실행 시점의 불확실성이 있어 이행 가능성이 충분히 보완되었다고 보기 어려움.",
          "재심사조정실의 검토 결과 원처분인 불승인을 유지하며 본 사건의 1회 이의신청 절차를 종결함.",
        ]),
  ];
  return {
    outcome,
    decidedAtISO: now,
    engineVersion: ENGINE_VERSION,
    analysis,
    ...(changed
      ? {
          approvedScope: clash
            ? `${plan!.resumeWithinMinutes}분 이내 첫 행동 착수 · 실제 마감 전 이행 조건`
            : `제출한 복귀 계획에 따른 착수 준비시간${plan!.resumeWithinMinutes !== undefined ? ` ${plan!.resumeWithinMinutes}분 이내` : ""}`,
        }
      : {}),
    factualFindings: [
      ...findings(input, analysis, supplement),
      "불승인 처분에 대한 1회 이의신청 및 추가 소명 접수를 확인함.",
    ],
    rationale,
    conditions: changed
      ? [
          clash
            ? `${plan!.resumeWithinMinutes}분 이내에 제출한 첫 행동을 시작하고 실제 마감기한 전에 대상업무를 이행할 것. 하루 전체의 유예는 인정되지 않음.`
            : `제출한 복귀 시점에 맞추어 ${plan!.action}`,
        ]
      : [],
    firstAction: firstAction(input, analysis),
    checks: [
      ...checks(input, analysis, outcome).slice(0, 4),
      {
        label: "재심사 의견",
        finding: changed
          ? "새로운 실행 근거 확인 · 이행조건을 붙여 원처분 변경"
          : "원처분 변경 근거 부족 · 불승인 유지",
      },
    ],
  };
}
