export type Outcome =
  | "approved"
  | "conditional"
  | "rejected"
  | "supplement_requested";
export type FormCode =
  | "F-01"
  | "F-02"
  | "F-03"
  | "F-04"
  | "F-05"
  | "F-06"
  | "F-07"
  | "F-08"
  | "F-09";
export type Application = {
  applicantAlias: string;
  taskCategory: "study" | "clean" | "exercise" | "reply" | "organize" | "other";
  taskDescription: string;
  reasonCategory: "motivation" | "fatigue" | "schedule" | "rest" | "other";
  reasonDetail: string;
  evidenceDetail: string;
  requestedMinutes: 10 | 30 | 120 | 1440;
  deadlineCategory: "today" | "later" | "none" | "unknown";
  reviewMode: "strict" | "lenient";
};
export type Decision = {
  outcome: Outcome;
  decidedAtISO: string;
  engineVersion: string;
  factualFindings: string[];
  rationale: string[];
  conditions: string[];
  firstAction: string;
  checks: { label: string; finding: string }[];
};
export type DocumentRecord = {
  code: FormCode;
  id: string;
  number: string;
  issuedAtISO: string;
  templateVersion: string;
  decision?: Decision;
};
export type CaseRecord = Application & {
  schemaVersion: 1;
  id: string;
  receiptNumber: string;
  createdAtISO: string;
  status:
    | "accepted"
    | "supplement_requested"
    | "approved"
    | "conditional"
    | "rejected"
    | "appeal_closed";
  consentVersion: string;
  optionalConsent: boolean;
  decision?: Decision;
  supplement?: {
    requestedAtISO: string;
    requestedDecision: Decision;
    response?: string;
    submittedAtISO?: string;
  };
  appeal?: {
    appealedAtISO: string;
    purpose: string;
    reason: string;
    originalDecision: Decision;
    decision: Decision;
  };
  documents: DocumentRecord[];
};
export const labels = {
  outcome: {
    approved: "승인",
    conditional: "조건부 승인",
    rejected: "불승인",
    supplement_requested: "보완요구",
  },
  category: {
    study: "학업·과제",
    clean: "청소",
    exercise: "운동",
    reply: "답장",
    organize: "정리",
    other: "기타 개인 일정",
  },
  reason: {
    motivation: "의욕 부족",
    fatigue: "피로",
    schedule: "일정 중복",
    rest: "휴식",
    other: "기타",
  },
  deadline: {
    today: "오늘",
    later: "내일 이후",
    none: "기한 없음",
    unknown: "불명",
  },
  mode: { strict: "엄격한 행정심사", lenient: "관대한 심사" },
  minutes: { 10: "10분", 30: "30분", 120: "2시간", 1440: "하루" },
};
export const formNames: Record<FormCode, string> = {
  "F-01": "일상업무 유예신청서",
  "F-02": "전자민원 접수증",
  "F-03": "사유 보완요구서",
  "F-04": "사유타당성 심사조서",
  "F-05": "일상업무 유예처분 내부결재서",
  "F-06": "일상업무 유예신청 처리결과 통지서",
  "F-07": "일상업무 유예승인 결정통지서",
  "F-08": "이의신청서",
  "F-09": "이의신청 심사결과 통지서",
};
