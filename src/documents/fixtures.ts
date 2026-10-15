import type { CaseRecord, Decision } from "../domain/types";

const date = "2026-10-15T01:15:00.000Z";
export const sampleDecision: Decision = {
  outcome: "rejected",
  decidedAtISO: date,
  engineVersion: "review-engine/1.0",
  factualFindings: [
    "신청인은 오늘 마감인 학업·과제를 하루 유예하고자 함.",
    "신청인은 업무 착수에 필요한 의욕이 부족함을 소명함.",
  ],
  rationale: [
    "신청인이 주장한 의욕 부족은 충분히 발생 가능한 사정으로 인정됨.",
    "다만, 익일 의욕 회복 가능성에 관한 구체적 소명이 부족하고, 실제 마감기한과 희망 유예기간이 충돌함.",
    "이에 따라 요청한 하루의 유예를 승인하기 곤란함.",
  ],
  conditions: [],
  firstAction: "과제 안내문을 열고 첫 번째 요구사항을 한 줄로 적을 것.",
  checks: [
    {
      label: "사유 구체성",
      finding: "의욕 부족 사실은 인정되나 해소 시점 불명확",
    },
    { label: "유예 적정성", finding: "오늘 마감과 하루 유예 사이의 충돌 확인" },
    { label: "종합 의견", finding: "심사 운영규정 제3조에 따라 불승인 권고" },
  ],
};
export const sampleCase: CaseRecord = {
  schemaVersion: 1,
  id: "design-sample",
  receiptNumber: "PM-20261015-K7Q4N2B8",
  createdAtISO: date,
  status: "rejected",
  consentVersion: "consent/1.0",
  optionalConsent: false,
  applicantAlias: "익명 신청인",
  taskCategory: "study",
  taskDescription: "오늘 해야 할 과제를 내일로 미루고 싶다.",
  reasonCategory: "motivation",
  reasonDetail:
    "업무 착수에 필요한 의욕이 부족하며, 오늘은 아무것도 시작하고 싶지 않습니다.",
  evidenceDetail: "",
  requestedMinutes: 1440,
  deadlineCategory: "today",
  reviewMode: "strict",
  decision: sampleDecision,
  documents: ["F-01", "F-02", "F-04", "F-05", "F-06"].map((code, i) => ({
    code: code as CaseRecord["documents"][number]["code"],
    id: `design-${code}`,
    number: `사유심사-2026-1015-K7Q4N2B8-${String(i + 1).padStart(2, "0")}호`,
    issuedAtISO: date,
    templateVersion: "forms/1.0",
    decision: sampleDecision,
  })),
};
export const approvedSample: CaseRecord = {
  ...sampleCase,
  id: "design-approved",
  receiptNumber: "PM-20261015-A3N8P4R2",
  taskCategory: "clean",
  taskDescription: "책상 위를 정리하기 전 잠깐 쉬고 싶다.",
  reasonCategory: "rest",
  reasonDetail:
    "오전 내내 정리 작업을 진행했습니다. 10분간 쉬고 난 뒤 책상 정리를 마무리하겠습니다.",
  requestedMinutes: 10,
  deadlineCategory: "none",
  status: "approved",
  decision: {
    ...sampleDecision,
    outcome: "approved",
    factualFindings: [
      "마감기한이 없는 정리 업무에 대하여 10분의 휴식을 요청함.",
    ],
    rationale: [
      "유예시간이 단시간이고 이후 업무 수행 계획이 구체적으로 소명된바, 생활상 의무 유예 처리지침 제2조에 따라 신청을 승인함.",
    ],
    firstAction: "책상 위 물건 하나를 제자리에 둘 것.",
  },
  documents: [],
};
