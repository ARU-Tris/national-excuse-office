import Dexie, { type EntityTable } from "dexie";
import type { Application, CaseRecord } from "../domain/types";
import { backupSchema } from "../domain/validation";

const database = new Dexie("national-excuse-office");
database
  .version(1)
  .stores({ cases: "id, &receiptNumber, createdAtISO, status", drafts: "id" });
const cases = database.table("cases") as EntityTable<CaseRecord, "id">;
type Draft = { id: string; input: Application; savedAtISO: string };
const drafts = database.table("drafts") as EntityTable<Draft, "id">;
const memory = new Map<string, CaseRecord>();
let memoryDraft: Draft | undefined;
let persistent = true;
export async function openStorage() {
  try {
    await database.open();
    await cases.count();
  } catch {
    persistent = false;
  }
  return persistent;
}
export function isPersistent() {
  return persistent;
}
export async function listCases() {
  return persistent
    ? (await cases.toArray()).sort((a, b) =>
        b.createdAtISO.localeCompare(a.createdAtISO),
      )
    : Array.from(memory.values()).sort((a, b) =>
        b.createdAtISO.localeCompare(a.createdAtISO),
      );
}
export async function addCase(record: CaseRecord) {
  if (persistent) await cases.add(record);
  else memory.set(record.id, structuredClone(record));
}
export async function changeCase(
  id: string,
  update: (record: CaseRecord) => CaseRecord,
) {
  if (!persistent) {
    const record = memory.get(id);
    if (!record) throw new Error("민원 기록을 찾을 수 없습니다.");
    const next = update(structuredClone(record));
    memory.set(id, next);
    return next;
  }
  return database.transaction("rw", cases, async () => {
    const current = await cases.get(id);
    if (!current) throw new Error("민원 기록을 찾을 수 없습니다.");
    const next = update(current);
    await cases.put(next);
    return next;
  });
}
export async function removeCase(id: string) {
  if (persistent) await cases.delete(id);
  else memory.delete(id);
}
export async function clearCases() {
  if (persistent) await cases.clear();
  else memory.clear();
}
export async function saveDraft(input: Application) {
  const draft = {
    id: "application",
    input,
    savedAtISO: new Date().toISOString(),
  };
  if (persistent) await drafts.put(draft);
  else memoryDraft = draft;
}
export async function readDraft() {
  return persistent ? drafts.get("application") : memoryDraft;
}
export async function clearDraft() {
  if (persistent) await drafts.delete("application");
  else memoryDraft = undefined;
}
export function exportBackup(
  records: CaseRecord[],
  now = new Date().toISOString(),
) {
  return JSON.stringify(
    {
      format: "national-excuse-office",
      schemaVersion: 1,
      exportedAtISO: now,
      cases: records,
    },
    null,
    2,
  );
}
export function parseBackup(text: string) {
  if (text.length > 25 * 1024 * 1024)
    throw new Error("백업 파일은 25MB 이내만 가져올 수 있습니다.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 백업 파일을 읽을 수 없습니다.");
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success)
    throw new Error(
      "지원하지 않는 백업 형식이거나 손상된 민원 기록입니다. 형식 버전 1의 JSON 백업을 선택해 주세요.",
    );
  const ids = new Set<string>(),
    receipts = new Set<string>();
  for (const record of result.data.cases) {
    if (ids.has(record.id) || receipts.has(record.receiptNumber))
      throw new Error(
        "백업에 중복된 사건번호가 있습니다. 가져오기를 취소했습니다.",
      );
    ids.add(record.id);
    receipts.add(record.receiptNumber);
    const codes = record.documents.map((d) => d.code);
    if (
      new Set(codes).size !== codes.length ||
      !codes.includes("F-01") ||
      !codes.includes("F-02")
    )
      throw new Error("백업의 문서 구성이 올바르지 않습니다.");
    for (const document of record.documents) {
      if (
        document.id !== `${record.id}:${document.code}` ||
        !document.number.includes(record.receiptNumber.split("-")[2])
      )
        throw new Error("문서 식별정보와 사건번호가 일치하지 않습니다.");
      if (!["F-01", "F-02"].includes(document.code) && !document.decision)
        throw new Error("문서의 고정 심사기록이 없습니다.");
    }
    if (record.status === "accepted" && record.decision)
      throw new Error("접수상태와 심사기록이 일치하지 않습니다.");
    if (record.status !== "accepted" && !record.decision)
      throw new Error("완료된 사건의 심사기록이 없습니다.");
    if (
      record.status !== "accepted" &&
      record.status !== "appeal_closed" &&
      record.status !== record.decision?.outcome
    )
      throw new Error("처리상태와 심사 결과가 일치하지 않습니다.");
    if (record.status === "appeal_closed" && !record.appeal)
      throw new Error("재심사 종결 사건의 이의신청 기록이 없습니다.");
    if (record.supplement?.response && !record.supplement.submittedAtISO)
      throw new Error("보완 접수일시가 없습니다.");
    if (record.appeal && record.status !== "appeal_closed")
      throw new Error("재심사 기록의 상태가 일치하지 않습니다.");
    if (
      record.status === "supplement_requested" &&
      (!record.supplement || !codes.includes("F-03"))
    )
      throw new Error("보완요구 서류가 없습니다.");
    if (
      record.decision &&
      record.decision.outcome !== "supplement_requested" &&
      !codes.includes("F-06")
    )
      throw new Error("처리결과 통지서가 없습니다.");
    if (record.appeal && (!codes.includes("F-08") || !codes.includes("F-09")))
      throw new Error("이의신청 서류가 없습니다.");
  }
  return result.data.cases as CaseRecord[];
}
export async function importBackup(text: string) {
  const incoming = parseBackup(text);
  const execute = async () => {
    const existing = await listCases();
    const ids = new Set(existing.map((c) => c.id));
    const receipts = new Set(existing.map((c) => c.receiptNumber));
    let added = 0,
      skipped = 0;
    for (const record of incoming) {
      if (ids.has(record.id) || receipts.has(record.receiptNumber)) {
        skipped++;
        continue;
      }
      await addCase(record);
      ids.add(record.id);
      receipts.add(record.receiptNumber);
      added++;
    }
    return { added, skipped };
  };
  return persistent ? database.transaction("rw", cases, execute) : execute();
}
