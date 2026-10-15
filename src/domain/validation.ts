import { z } from "zod";
const bounded = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label}은(는) ${min}자 이상 입력해 주세요.`)
    .max(max, `${label}은(는) ${max}자 이내로 입력해 주세요.`);
export const applicationSchema = z.object({
  applicantAlias: z
    .string()
    .trim()
    .max(30, "표시명은 30자 이내로 입력해 주세요.")
    .transform((v) => v || "익명 신청인"),
  taskCategory: z.enum([
    "study",
    "clean",
    "exercise",
    "reply",
    "organize",
    "other",
  ]),
  taskDescription: bounded(5, 160, "해야 할 일"),
  reasonCategory: z.enum([
    "motivation",
    "fatigue",
    "schedule",
    "rest",
    "other",
  ]),
  reasonDetail: bounded(5, 1000, "신청 사유"),
  evidenceDetail: z
    .string()
    .trim()
    .max(1500, "부연 소명은 1,500자 이내로 입력해 주세요."),
  requestedMinutes: z.union([
    z.literal(10),
    z.literal(30),
    z.literal(120),
    z.literal(1440),
  ]),
  deadlineCategory: z.enum(["today", "later", "none", "unknown"]),
  reviewMode: z.enum(["strict", "lenient"]),
});
export const draftSchema = applicationSchema.extend({
  applicantAlias: z.string().max(30),
  taskDescription: z.string().max(160),
  reasonDetail: z.string().max(1000),
});
const iso = z.iso.datetime({ offset: true });
const outcome = z.enum([
  "approved",
  "conditional",
  "rejected",
  "supplement_requested",
]);
export const decisionSchema = z.object({
  outcome,
  decidedAtISO: iso,
  engineVersion: z.enum(["review-engine/1.0", "review-engine/2.0"]),
  factualFindings: z.array(z.string().max(3000)).min(1).max(20),
  rationale: z.array(z.string().max(5000)).min(1).max(20),
  conditions: z.array(z.string().max(2000)).max(20),
  firstAction: z.string().min(1).max(1000),
  checks: z
    .array(
      z.object({ label: z.string().max(100), finding: z.string().max(3000) }),
    )
    .min(1)
    .max(20),
  analysis: z
    .object({
      version: z.literal("sentence-rules/2.0"),
      facts: z
        .array(
          z.object({
            code: z.enum([
              "fatigue",
              "sleep_loss",
              "health",
              "overload",
              "rest",
              "motivation",
              "leisure",
              "schedule",
              "dependency",
              "technical",
              "anxiety",
              "preparation_complete",
              "in_progress",
              "nearly_complete",
              "not_started",
              "remaining_work",
              "completed",
              "recovered",
              "block_resolved",
            ]),
            source: z.enum([
              "task",
              "reason",
              "evidence",
              "supplement",
              "appeal",
            ]),
            excerpt: z.string().min(1).max(160),
          }),
        )
        .max(24),
      plan: z
        .object({
          source: z.enum([
            "task",
            "reason",
            "evidence",
            "supplement",
            "appeal",
          ]),
          excerpt: z.string().min(1).max(160),
          action: z.string().min(1).max(300),
          timing: z.string().min(1).max(100),
          resumeWithinMinutes: z.number().min(0).max(10080).optional(),
          sameDay: z.boolean(),
          laterDay: z.boolean(),
          contingent: z.boolean(),
        })
        .optional(),
      deadline: z.object({
        value: z.enum(["today", "later", "none", "unknown"]),
        source: z.enum([
          "selection",
          "task",
          "reason",
          "evidence",
          "supplement",
          "appeal",
        ]),
        excerpt: z.string().max(160).optional(),
      }),
      issues: z
        .array(
          z.object({
            code: z.enum([
              "deadline_unknown",
              "deadline_conflict",
              "reason_unclear",
              "plan_duration",
              "already_completed",
            ]),
            question: z.string().min(1).max(1000),
          }),
        )
        .max(5),
    })
    .optional(),
  approvedScope: z.string().min(1).max(500).optional(),
});
const documentSchema = z.object({
  code: z.enum([
    "F-01",
    "F-02",
    "F-03",
    "F-04",
    "F-05",
    "F-06",
    "F-07",
    "F-08",
    "F-09",
  ]),
  id: z.string().min(1).max(150),
  number: z.string().min(1).max(200),
  issuedAtISO: iso,
  templateVersion: z.literal("forms/1.0"),
  decision: decisionSchema.optional(),
});
export const caseSchema = applicationSchema.extend({
  schemaVersion: z.literal(1),
  id: z.uuid(),
  receiptNumber: z.string().regex(/^PM-\d{8}-[A-Z0-9]{8,16}$/),
  createdAtISO: iso,
  status: z.enum([
    "accepted",
    "supplement_requested",
    "approved",
    "conditional",
    "rejected",
    "appeal_closed",
  ]),
  consentVersion: z.literal("consent/1.0"),
  optionalConsent: z.boolean(),
  decision: decisionSchema.optional(),
  supplement: z
    .object({
      requestedAtISO: iso,
      requestedDecision: decisionSchema,
      response: z.string().min(10).max(1500).optional(),
      submittedAtISO: iso.optional(),
    })
    .optional(),
  appeal: z
    .object({
      appealedAtISO: iso,
      purpose: z.string().min(5).max(300),
      reason: z.string().min(10).max(1500),
      originalDecision: decisionSchema,
      decision: decisionSchema,
    })
    .optional(),
  documents: z.array(documentSchema).min(2).max(9),
});
export const backupSchema = z.object({
  format: z.literal("national-excuse-office"),
  schemaVersion: z.literal(1),
  exportedAtISO: iso,
  cases: z.array(caseSchema).max(2000),
});
export const responseSchema = bounded(10, 1500, "추가 소명");
