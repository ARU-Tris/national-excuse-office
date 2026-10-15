import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, it, expect } from "vitest";
import { createCase, reviewCase, appealCase } from "../src/domain/cases";
import { sampleCase } from "../src/documents/fixtures";
import * as storage from "../src/storage/database";
const record = () =>
  reviewCase(
    createCase({ ...sampleCase }, false, "2026-10-15T01:00:00.000Z"),
    "2026-10-15T01:01:00.000Z",
  );
beforeAll(async () => {
  expect(await storage.openStorage()).toBe(true);
});
beforeEach(async () => {
  await storage.clearCases();
  await storage.clearDraft();
});
describe("local records and portable backups", () => {
  it("round-trips receipt numbers, decisions, and document metadata", () => {
    const original = record();
    expect(storage.parseBackup(storage.exportBackup([original]))).toEqual([
      original,
    ]);
  });
  it("restores legacy decisions and documents without recalculating them", async () => {
    const legacy = record();
    legacy.decision!.engineVersion = "review-engine/1.0";
    delete legacy.decision!.analysis;
    delete legacy.decision!.approvedScope;
    for (const document of legacy.documents) {
      if (!document.decision) continue;
      document.decision.engineVersion = "review-engine/1.0";
      delete document.decision.analysis;
      delete document.decision.approvedScope;
    }
    const exported = storage.exportBackup([legacy]);
    await storage.importBackup(exported);
    const [restored] = await storage.listCases();
    expect(restored).toEqual(legacy);
    expect(reviewCase(restored, "2027-01-01T00:00:00.000Z")).toBe(restored);
    const originalDocument = structuredClone(
      restored.documents.find((d) => d.code === "F-06"),
    );
    const appealed = appealCase(
      restored,
      "새 계획을 반영해 주세요.",
      "10분 뒤 본문을 작성하겠습니다.",
      "2026-10-15T02:00:00.000Z",
    );
    expect(appealed.appeal?.decision.engineVersion).toBe("review-engine/2.0");
    expect(appealed.documents.find((d) => d.code === "F-06")).toEqual(
      originalDocument,
    );
    expect(storage.parseBackup(storage.exportBackup([appealed]))).toEqual([
      appealed,
    ]);
  });
  it("imports without overwriting existing records", async () => {
    const original = record();
    await storage.addCase(original);
    const incoming = {
      ...original,
      reasonDetail: "기존 기록을 덮어쓰지 않아야 합니다.",
    };
    expect(
      await storage.importBackup(storage.exportBackup([incoming])),
    ).toEqual({ added: 0, skipped: 1 });
    expect((await storage.listCases())[0]).toEqual(original);
  });
  it("imports into an empty store and preserves final decisions", async () => {
    const original = record();
    await storage.importBackup(storage.exportBackup([original]));
    expect((await storage.listCases())[0]).toEqual(original);
  });
  it("rejects invalid schema and inconsistent states before writing", async () => {
    const original = record();
    const backup = JSON.parse(storage.exportBackup([original]));
    backup.schemaVersion = 2;
    await expect(storage.importBackup(JSON.stringify(backup))).rejects.toThrow(
      "형식",
    );
    backup.schemaVersion = 1;
    backup.cases[0].documents = [];
    await expect(
      storage.importBackup(JSON.stringify(backup)),
    ).rejects.toThrow();
    expect(await storage.listCases()).toHaveLength(0);
  });
  it("rejects duplicate records in the input", () => {
    const original = record();
    expect(() =>
      storage.parseBackup(storage.exportBackup([original, original])),
    ).toThrow("중복");
  });
  it("rejects mismatched disposition and document identities", () => {
    const original = record();
    expect(() =>
      storage.parseBackup(
        storage.exportBackup([{ ...original, status: "approved" }]),
      ),
    ).toThrow("일치");
    const tampered = structuredClone(original);
    tampered.documents[0].id = "different-case:F-01";
    expect(() => storage.parseBackup(storage.exportBackup([tampered]))).toThrow(
      "일치",
    );
  });
  it("serializes concurrent review updates to one set of forms", async () => {
    const original = createCase(
      { ...sampleCase },
      false,
      "2026-10-15T01:00:00.000Z",
    );
    await storage.addCase(original);
    await Promise.all([
      storage.changeCase(original.id, (r) =>
        reviewCase(r, "2026-10-15T01:01:00.000Z"),
      ),
      storage.changeCase(original.id, (r) =>
        reviewCase(r, "2026-10-16T01:01:00.000Z"),
      ),
    ]);
    const [final] = await storage.listCases();
    expect(final.documents.filter((d) => d.code === "F-06")).toHaveLength(1);
    expect(final.decision?.decidedAtISO).toBe("2026-10-15T01:01:00.000Z");
  });
  it("saves drafts and supports individual and full deletion", async () => {
    const first = record(),
      second = record();
    await storage.saveDraft(first);
    expect((await storage.readDraft())?.input.taskDescription).toBe(
      first.taskDescription,
    );
    await storage.addCase(first);
    await storage.addCase(second);
    await storage.removeCase(first.id);
    expect((await storage.listCases()).map((c) => c.id)).toEqual([second.id]);
    await storage.clearCases();
    await storage.clearDraft();
    expect(await storage.listCases()).toEqual([]);
    expect(await storage.readDraft()).toBeUndefined();
  });
});
