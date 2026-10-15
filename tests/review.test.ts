import { describe, it, expect } from "vitest";
import { type Application } from "../src/domain/types";
import { reviewApplication } from "../src/domain/review";
import {
  createCase,
  reviewCase,
  supplementCase,
  appealCase,
} from "../src/domain/cases";
import { applicationSchema, draftSchema } from "../src/domain/validation";
import { formatDate, dateKey } from "../src/utils/time";
const now = "2026-10-14T15:01:00.000Z";
const input: Application = {
  applicantAlias: "익명 신청인",
  taskCategory: "study",
  taskDescription: "오늘 해야 할 과제를 내일로 미루고 싶다.",
  reasonCategory: "motivation",
  reasonDetail: "시작할 의욕이 없다.",
  evidenceDetail: "",
  requestedMinutes: 1440,
  deadlineCategory: "today",
  reviewMode: "strict",
};
describe("representative decisions and case preservation", () => {
  it("rejects the brief’s exact same-day, one-day, low-motivation example", () => {
    expect(reviewApplication(input, now).outcome).toBe("rejected");
  });
  it("approves concrete short rest without a deadline", () => {
    const result = reviewApplication(
      {
        ...input,
        deadlineCategory: "none",
        requestedMinutes: 10,
        reasonDetail:
          "오전에 정리 작업을 계속 진행하여 잠시 쉬고자 합니다. 10분이 지나면 책상 위 서류부터 분류하겠습니다.",
      },
      now,
    );
    expect(result.outcome).toBe("approved");
    expect(result.firstAction).toBeTruthy();
  });
  it("uses leniency to impose conditions rather than changing the real deadline", () => {
    const result = reviewApplication({ ...input, reviewMode: "lenient" }, now);
    expect(result.outcome).toBe("conditional");
    expect(result.conditions).toHaveLength(1);
    expect(result.rationale.join(" ")).toContain("실제 마감기한");
  });
  it("prioritizes missing information and requests one supplement", () => {
    expect(
      reviewApplication({ ...input, deadlineCategory: "unknown" }, now).outcome,
    ).toBe("supplement_requested");
  });
  it("always makes a final decision after the supplement", () => {
    const record = reviewCase(
      createCase({ ...input, deadlineCategory: "unknown" }, false, now),
      now,
    );
    const final = supplementCase(record, "기한을 확인하기 어렵습니다.", now);
    expect(final.status).not.toBe("supplement_requested");
    expect(final.documents.map((d) => d.code)).toContain("F-03");
    expect(final.documents.map((d) => d.code)).toContain("F-06");
    expect(() =>
      supplementCase(final, "추가로 소명하는 내용입니다.", now),
    ).toThrow("1회");
  });
  it("stores original and appeal notices independently", () => {
    const original = reviewCase(createCase(input, false, now), now);
    const snapshot = JSON.stringify(
      original.documents.find((d) => d.code === "F-06"),
    );
    const appealed = appealCase(
      original,
      "원처분의 변경을 요청합니다.",
      "새롭게 확인한 계획에 따라 과제의 자료 조사를 이미 완료했습니다. 10분 안에 개요를 작성하고 첫 번째 문단에 착수할 구체적인 시간 계획을 제출합니다.",
      "2026-10-15T01:00:00.000Z",
    );
    expect(appealed.appeal?.decision.outcome).toBe("conditional");
    expect(
      JSON.stringify(appealed.documents.find((d) => d.code === "F-06")),
    ).toBe(snapshot);
    expect(appealed.decision).toEqual(original.decision);
    expect(appealed.documents.map((d) => d.code)).toEqual([
      "F-01",
      "F-02",
      "F-04",
      "F-05",
      "F-06",
      "F-08",
      "F-09",
      "F-07",
    ]);
    expect(() =>
      appealCase(
        appealed,
        "다시 신청합니다.",
        "같은 사유로 다시 신청합니다.",
        now,
      ),
    ).toThrow("1회");
  });
  it("maintains a rejection when the appeal supplies no concrete new plan", () => {
    const original = reviewCase(createCase(input, false, now), now);
    expect(
      appealCase(
        original,
        "원처분에 이의를 제기합니다.",
        "여전히 의욕이 생기지 않습니다.",
        now,
      ).appeal?.decision.outcome,
    ).toBe("rejected");
  });
  it("does not recalculate on reopening a completed case", () => {
    const record = reviewCase(createCase(input, false, now), now);
    expect(reviewCase(record, "2027-01-01T00:00:00.000Z")).toBe(record);
  });
  it("fixes document metadata at the event and emits only occurred forms", () => {
    const accepted = createCase(input, false, now);
    expect(accepted.documents.map((d) => d.code)).toEqual(["F-01", "F-02"]);
    const rejected = reviewCase(accepted, now);
    expect(rejected.documents.map((d) => d.code)).not.toContain("F-07");
    expect(new Set(rejected.documents.map((d) => d.number)).size).toBe(
      rejected.documents.length,
    );
    expect(rejected.documents.every((d) => d.issuedAtISO === now)).toBe(true);
  });
});
describe("validation and Seoul dates", () => {
  it("restores drafts before required fields have been completed", () => {
    const draft = {
      ...input,
      taskDescription: "일부 작성한 내용",
      reasonDetail: "",
      applicantAlias: "",
    };
    expect(draftSchema.safeParse(draft).success).toBe(true);
    expect(applicationSchema.safeParse(draft).success).toBe(false);
  });
  it("enforces all specified input bounds without converting text into HTML", () => {
    expect(
      applicationSchema.safeParse({ ...input, reasonDetail: "가".repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({ ...input, taskDescription: "일" }).success,
    ).toBe(false);
    expect(
      applicationSchema.parse({
        ...input,
        reasonDetail: "<script>alert(1)</script>",
      }).reasonDetail,
    ).toBe("<script>alert(1)</script>");
    expect(
      applicationSchema.parse({ ...input, applicantAlias: "" }).applicantAlias,
    ).toBe("익명 신청인");
  });
  it("uses Seoul dates regardless of host timezone", () => {
    expect(dateKey(now)).toBe("20261015");
    expect(formatDate(now, true)).toBe("2026.10.15. 00:01");
    expect(createCase(input, false, now).receiptNumber).toMatch(
      /^PM-20261015-[A-Z0-9]{8}$/,
    );
  });
});
