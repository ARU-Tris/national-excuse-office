import {
  type Application,
  type CaseRecord,
  type Decision,
  type FormCode,
  type DocumentRecord,
} from "./types";
import { dateKey, seoulParts } from "../utils/time";
import { reviewApplication, reviewAppeal } from "./review";
import { applicationSchema, responseSchema } from "./validation";
export function newReceiptNumber(now: string, existing: Iterable<string> = []) {
  const known = new Set(existing);
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const suffix = Array.from(
      bytes,
      (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32],
    ).join("");
    const receipt = `PM-${dateKey(now)}-${suffix}`;
    if (!known.has(receipt)) return receipt;
  }
  throw new Error("새 접수번호를 발급할 수 없습니다. 다시 시도해 주세요.");
}
function documentFor(
  record: CaseRecord,
  code: FormCode,
  now: string,
  decision?: Decision,
): DocumentRecord {
  const p = seoulParts(now);
  return {
    code,
    id: `${record.id}:${code}`,
    number: `${code === "F-09" ? "재심사" : "사유심사"}-${p.year}-${p.month}${p.day}-${record.receiptNumber.split("-")[2]}-${code.slice(2)}호`,
    issuedAtISO: now,
    templateVersion: "forms/1.0",
    ...(decision ? { decision: structuredClone(decision) } : {}),
  };
}
export function createCase(
  input: Application,
  optionalConsent: boolean,
  now: string,
  existing: Iterable<string> = [],
  id = crypto.randomUUID(),
): CaseRecord {
  const record: CaseRecord = {
    ...applicationSchema.parse(input),
    schemaVersion: 1,
    id,
    receiptNumber: newReceiptNumber(now, existing),
    createdAtISO: now,
    status: "accepted",
    consentVersion: "consent/1.0",
    optionalConsent,
    documents: [],
  };
  record.documents = ["F-01", "F-02"].map((code) =>
    documentFor(record, code as FormCode, now),
  );
  return record;
}
function addFinalDocuments(
  record: CaseRecord,
  decision: Decision,
  now: string,
) {
  const forms: FormCode[] = ["F-04", "F-05", "F-06"];
  if (decision.outcome === "approved" || decision.outcome === "conditional")
    forms.push("F-07");
  return [
    ...record.documents,
    ...forms
      .filter((code) => !record.documents.some((d) => d.code === code))
      .map((code) => documentFor(record, code, now, decision)),
  ];
}
export function reviewCase(current: CaseRecord, now: string): CaseRecord {
  if (current.decision) return current;
  const decision = reviewApplication(current, now);
  const record: CaseRecord = { ...current, decision, status: decision.outcome };
  if (decision.outcome === "supplement_requested") {
    record.supplement = {
      requestedAtISO: now,
      requestedDecision: structuredClone(decision),
    };
    record.documents = [
      ...current.documents,
      documentFor(record, "F-03", now, decision),
    ];
  } else record.documents = addFinalDocuments(record, decision, now);
  return record;
}
export function supplementCase(
  current: CaseRecord,
  response: string,
  now: string,
): CaseRecord {
  if (
    current.status !== "supplement_requested" ||
    !current.supplement ||
    current.supplement.response
  )
    throw new Error(
      "보완자료는 보완요구 사건에 한하여 1회 제출할 수 있습니다.",
    );
  const value = responseSchema.parse(response);
  const decision = reviewApplication(current, now, value);
  const record: CaseRecord = {
    ...current,
    status: decision.outcome,
    decision,
    supplement: { ...current.supplement, response: value, submittedAtISO: now },
  };
  record.documents = addFinalDocuments(record, decision, now);
  return record;
}
export function appealCase(
  current: CaseRecord,
  purpose: string,
  reason: string,
  now: string,
): CaseRecord {
  if (current.decision?.outcome !== "rejected" || current.appeal)
    throw new Error("불승인 처분에 한하여 1회 이의신청할 수 있습니다.");
  if (purpose.trim().length < 5 || purpose.trim().length > 300)
    throw new Error("이의 취지는 5~300자로 작성해 주세요.");
  const detail = responseSchema.parse(reason);
  const originalDecision = structuredClone(current.decision);
  const decision = reviewAppeal(
    current,
    originalDecision,
    detail,
    now,
    current.supplement?.response,
  );
  const record: CaseRecord = {
    ...current,
    status: "appeal_closed",
    appeal: {
      appealedAtISO: now,
      purpose: purpose.trim(),
      reason: detail,
      originalDecision,
      decision,
    },
  };
  record.documents = [
    ...current.documents,
    documentFor(record, "F-08", now, originalDecision),
    documentFor(record, "F-09", now, decision),
  ];
  if (decision.outcome === "conditional" || decision.outcome === "approved")
    record.documents.push(documentFor(record, "F-07", now, decision));
  return record;
}
export function currentDecision(record: CaseRecord) {
  return record.appeal?.decision ?? record.decision;
}
