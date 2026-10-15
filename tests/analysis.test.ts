import { describe, expect, it } from "vitest";
import { analyzeApplication, relativeTime } from "../src/domain/analysis";
import { reviewApplication, reviewAppeal } from "../src/domain/review";
import { type Application, type FactCode } from "../src/domain/types";
import { decisionSchema } from "../src/domain/validation";

const now = "2026-10-15T12:00:00.000Z";
const base: Application = {
  applicantAlias: "익명 신청인",
  taskCategory: "study",
  taskDescription: "보고서 본문 작성하기",
  reasonCategory: "other",
  reasonDetail: "사유를 설명합니다.",
  evidenceDetail: "",
  requestedMinutes: 10,
  deadlineCategory: "none",
  reviewMode: "strict",
};
const analyze = (text: string) =>
  analyzeApplication({ ...base, reasonDetail: text });
const codes = (text: string) => analyze(text).facts.map((f) => f.code);
describe("Korean statements: personal facts, negation and progress", () => {
  it.each<[string, FactCode]>([
    ["오늘은 너무 피곤하다.", "fatigue"],
    ["몸이 무겁고 졸려서 쉬고 싶다.", "fatigue"],
    ["잠을 제대로 못 잤다.", "sleep_loss"],
    ["밤을 새웠다.", "sleep_loss"],
    ["머리가 아파서 잠시 쉬어야 한다.", "health"],
    ["오전 내내 정리 작업을 진행했다.", "overload"],
    ["시작할 의욕이 없다.", "motivation"],
    ["업무 착수에 필요한 의욕이 부족합니다.", "motivation"],
    ["손이 안 가고 귀찮다.", "motivation"],
    ["게임 좀 하다가 내일 쓰고 싶다.", "leisure"],
    ["유튜브를 더 보고 싶다.", "leisure"],
    ["오후 회의가 겹쳐서 지금 작성하기 어렵다.", "schedule"],
    ["담당자의 회신을 기다리고 있다.", "dependency"],
    ["자료를 아직 받지 못했다.", "dependency"],
    ["인터넷이 끊겨서 제출 화면에 접속할 수 없다.", "technical"],
    ["어디서부터 시작할지 모르겠고 막막하다.", "anxiety"],
    ["자료는 다 찾았고 본문만 남았다.", "preparation_complete"],
    ["과제를 절반 정도 작성했다.", "in_progress"],
    ["최종 검토만 남았다.", "nearly_complete"],
    ["아직 시작도 못 했다.", "not_started"],
    ["과제를 이미 전부 끝냈다.", "completed"],
  ])("extracts an asserted state: %s", (text, code) => {
    expect(codes(text)).toContain(code);
  });
  it.each<[string, FactCode]>([
    ["피곤하지 않다.", "fatigue"],
    ["피곤하진 않습니다.", "fatigue"],
    ["안 피곤하다.", "fatigue"],
    ["피곤한 건 아니다.", "fatigue"],
    ["피곤한 척했다.", "fatigue"],
    ["의욕이 없는 건 아니다.", "motivation"],
    ["귀찮지는 않다.", "motivation"],
    ["게임을 하고 싶지 않다.", "leisure"],
    ["게임을 하려는 게 아니다.", "leisure"],
    ["자료를 다 찾았다는 건 아니다.", "preparation_complete"],
    ["친구가 피곤하다고 했다.", "fatigue"],
    ["예를 들어 피곤하면 쉬면 된다.", "fatigue"],
    ["만약 자료를 다 찾았다면 본문을 쓸 것이다.", "preparation_complete"],
    ["“피곤하다”라는 문장은 예시다.", "fatigue"],
    ["계획 시간 완료 일정 변경 진행 확인", "completed"],
  ])(
    "does not turn a denial, example or keyword into a fact: %s",
    (text, code) => {
      expect(codes(text)).not.toContain(code);
    },
  );
  it("distinguishes lack of sleep from a negated fatigue claim", () => {
    const facts = codes("피곤하지 않지만 잠을 제대로 못 잤다.");
    expect(facts).not.toContain("fatigue");
    expect(facts).toContain("sleep_loss");
  });
  it("does not use yesterday's resolved fatigue as the current cause", () => {
    const facts = codes(
      "어제는 피곤했으나 지금은 괜찮다. 지금은 게임을 하고 싶다.",
    );
    expect(facts).not.toContain("fatigue");
    expect(facts).toContain("leisure");
  });
  it("uses a later personal denial without discarding an unrelated real sentence", () => {
    const result = codes(
      "예를 들어 피곤하면 쉰다. 피곤하다고 적었다. 사실 지금 피곤한 건 아니다. 게임을 하고 싶다.",
    );
    expect(result).not.toContain("fatigue");
    expect(result).toContain("leisure");
  });
  it("distinguishes unfinished body writing from final submission", () => {
    expect(codes("자료는 다 찾았고 본문만 남았다.")).toContain(
      "remaining_work",
    );
    expect(codes("자료는 다 찾았고 본문만 남았다.")).not.toContain(
      "nearly_complete",
    );
  });
});

describe("return plans require timing, an action and an actual commitment", () => {
  it.each([
    "10분 뒤 본문의 첫 문장을 작성하겠습니다.",
    "열 분만 쉬고 본문을 쓰겠습니다.",
    "삼십 분 휴식한 뒤 보고서 개요를 작성하겠습니다.",
    "휴식이 끝나면 책상 위 서류부터 분류하겠습니다.",
    "지금 바로 보고서 본문에 착수하겠습니다.",
    "오늘 오후 9시부터 과제의 첫 문단을 작성하겠습니다.",
    "10분 뒤 보고서 본문을 작성할게요.",
    "잠을 두 시간밖에 못 잤고 10분 뒤 개요를 작성하겠습니다.",
  ])("recognizes an executable plan: %s", (text) => {
    expect(analyze(text).plan).toBeDefined();
  });
  it.each([
    "10분 뒤 본문을 작성할 계획이 없습니다.",
    "10분 뒤 본문을 작성하지 않겠습니다.",
    "10분 뒤 본문을 안 쓰겠습니다.",
    "10분 뒤 시작할 수 없습니다.",
    "언젠가 보고서를 잘 작성하겠습니다.",
    "계획 시간 착수 완료 일정 변경을 확인합니다.",
    "10분 뒤 게임을 하겠습니다.",
    "10분 뒤 계획을 제출하겠습니다.",
    "10분 뒤 시작할지는 모르겠습니다.",
    "보고서 본문 작성 완료",
  ])("does not invent a return plan: %s", (text) => {
    expect(analyze(text).plan).toBeUndefined();
  });
  it("extracts the return delay rather than the sleep duration", () => {
    expect(
      analyze("잠을 두 시간밖에 못 잤고 10분 뒤 개요를 작성하겠습니다.").plan
        ?.resumeWithinMinutes,
    ).toBe(10);
  });
  it("chooses a future action instead of an earlier completed activity", () => {
    expect(
      analyze("서류를 정리했고 10분 뒤 본문을 작성하겠습니다.").plan?.action,
    ).toContain("본문");
  });
  it.each<[string, number]>([
    ["열 분", 10],
    ["삼십 분", 30],
    ["스물다섯 분", 25],
    ["두 시간 반", 150],
    ["반 시간", 30],
    ["２ 시간 ３０ 분", 150],
  ])("reads relative times: %s", (text, minutes) => {
    expect(relativeTime(text.normalize("NFKC"))?.minutes).toBe(minutes);
  });
});

describe("grounded decisions and targeted missing information", () => {
  it("does not mistake the task's postponement request for the stated cause", () => {
    const result = reviewApplication(
      {
        ...base,
        taskDescription: "오늘 해야 할 과제를 내일로 미루고 싶다.",
        reasonDetail: "피곤하지 않다. 게임을 더 하고 싶다.",
      },
      now,
    );
    expect(result.rationale.join(" ")).toContain("여가 활동");
    expect(result.rationale.join(" ")).not.toContain("착수 의욕 부족을 기재함");
  });
  it("does not use the task's wish alone to fill in an incomprehensible reason", () => {
    const result = reviewApplication(
      {
        ...base,
        taskDescription: "과제를 내일로 미루고 싶다.",
        reasonDetail: "가나다라마바사아자차카타파하",
      },
      now,
    );
    expect(result.outcome).toBe("supplement_requested");
  });
  it("bases rejection on preparation, leisure and the actual deadline", () => {
    const decision = reviewApplication(
      {
        ...base,
        requestedMinutes: 1440,
        deadlineCategory: "today",
        reasonDetail:
          "오늘 마감인데 자료는 다 찾았고 본문만 남았다. 게임 좀 하다가 내일 쓰고 싶다.",
      },
      now,
    );
    expect(decision.outcome).toBe("rejected");
    expect(decision.rationale.join(" ")).toMatch(/본문|마무리/u);
    expect(decision.rationale.join(" ")).toContain("여가 활동");
    expect(decision.rationale.join(" ")).toContain("오늘의 마감기한");
    expect(decision.firstAction).toContain("남았다고");
    expect(decisionSchema.safeParse(decision).success).toBe(true);
  });
  it("approves a short meaningful sentence and refuses a long keyword list", () => {
    const meaningful = reviewApplication(
      { ...base, reasonDetail: "졸려서 쉰다. 10분 뒤 본문을 쓰겠다." },
      now,
    );
    const empty = reviewApplication(
      {
        ...base,
        reasonDetail: "계획 시간 완료 일정 진행 변경 확인 ".repeat(40),
      },
      now,
    );
    expect(meaningful.outcome).toBe("approved");
    expect(empty.outcome).toBe("supplement_requested");
    expect(empty.rationale.join(" ")).toContain("미루어야 하는 사정");
  });
  it("takes the reason from the text instead of the chosen reason label", () => {
    const result = reviewApplication(
      {
        ...base,
        reasonCategory: "fatigue",
        reasonDetail: "피곤하지 않다. 게임을 더 하고 싶다.",
      },
      now,
    );
    expect(result.outcome).toBe("conditional");
    expect(result.rationale.join(" ")).not.toContain("피로·기력 저하 정황");
    expect(result.rationale.join(" ")).toContain("여가 활동");
  });
  it("does not approve deadline-free long text without a return action", () => {
    const result = reviewApplication(
      { ...base, reasonDetail: "피곤해서 쉬고 싶습니다. ".repeat(20) },
      now,
    );
    expect(result.outcome).toBe("conditional");
    expect(
      result.checks.find((c) => c.label === "복귀 가능성")?.finding,
    ).toContain("확인되지 않음");
  });
  it("recognizes a stated deadline when the selection is unknown", () => {
    const result = reviewApplication(
      {
        ...base,
        deadlineCategory: "unknown",
        reasonDetail:
          "마감은 내일이다. 피곤해서 10분 뒤 본문을 작성하겠습니다.",
      },
      now,
    );
    expect(result.analysis?.deadline.value).toBe("later");
    expect(result.outcome).toBe("conditional");
  });
  it("asks about contradictory deadlines instead of choosing the more favorable one", () => {
    const result = reviewApplication(
      {
        ...base,
        reasonDetail: "오늘 마감이다. 10분 뒤 본문을 작성하겠습니다.",
      },
      now,
    );
    expect(result.outcome).toBe("supplement_requested");
    expect(result.rationale.join(" ")).toContain("일치하지 않음");
  });
  it("does not treat an unknown or hypothetical deadline as a fact", () => {
    for (const text of [
      "마감이 오늘인지 모르겠다. 피곤하다.",
      "마감이 오늘이면 좋겠다. 피곤하다.",
    ]) {
      expect(
        analyzeApplication({
          ...base,
          deadlineCategory: "unknown",
          reasonDetail: text,
        }).deadline.value,
      ).toBe("unknown");
    }
  });
  it("uses an explicit correction in the single supplement and preserves the application", () => {
    const input = { ...base, reasonDetail: "오늘 마감이다. 피곤하다." };
    const copy = structuredClone(input);
    const result = reviewApplication(
      input,
      now,
      "확인 결과 마감은 내일입니다. 10분 뒤 본문을 작성하겠습니다.",
    );
    expect(result.analysis?.deadline.value).toBe("later");
    expect(result.outcome).toBe("conditional");
    expect(input).toEqual(copy);
  });
  it("asks for a time correction when a two-hour plan accompanies a ten-minute request", () => {
    expect(
      reviewApplication(
        {
          ...base,
          reasonDetail: "피곤하다. 두 시간 뒤 본문을 작성하겠습니다.",
        },
        now,
      ).analysis?.issues.map((i) => i.code),
    ).toContain("plan_duration");
  });
  it("asks for a time correction when tomorrow is attached to a short plan", () => {
    expect(
      reviewApplication(
        {
          ...base,
          reasonDetail: "피곤하다. 내일 10분 뒤 본문을 작성하겠습니다.",
        },
        now,
      ).outcome,
    ).toBe("supplement_requested");
  });
  it("does not unconditionally approve a plan that depends on an unreceived reply", () => {
    const result = reviewApplication(
      {
        ...base,
        reasonDetail:
          "담당자의 회신을 기다리고 있다. 답변이 오면 본문을 작성하겠습니다.",
      },
      now,
    );
    expect(result.outcome).toBe("conditional");
    expect(result.analysis?.plan?.contingent).toBe(true);
    expect(result.rationale.join(" ")).toContain("외부 대기");
  });
  it("recognizes a resolved dependency without erasing a different pending dependency", () => {
    const result = analyzeApplication(
      {
        ...base,
        reasonDetail: "자료를 아직 받지 못했다. 담당자의 회신을 기다리고 있다.",
      },
      "기다리던 자료를 방금 받았습니다. 10분 뒤 개요를 작성하겠습니다.",
    );
    const dependencies = result.facts.filter((f) => f.code === "dependency");
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].excerpt).toContain("회신");
  });
  it("asks what remains when the task has already been completed", () => {
    const result = reviewApplication(
      { ...base, reasonDetail: "과제를 이미 전부 끝냈다. 피곤해서 쉬고 싶다." },
      now,
    );
    expect(result.outcome).toBe("supplement_requested");
    expect(result.rationale.join(" ")).toContain("남은 작업");
  });
  it("is deterministic and retains source text for every factual claim", () => {
    const input = {
      ...base,
      reasonDetail:
        "자료를 이미 찾았다. 피곤해서 10분 뒤 본문을 작성하겠습니다.",
    };
    const result = reviewApplication(input, now);
    expect(result).toEqual(reviewApplication(input, now));
    for (const f of result.analysis!.facts)
      expect(
        [input.taskDescription, input.reasonDetail, input.evidenceDetail].join(
          " ",
        ),
      ).toContain(f.excerpt);
  });
  it("quotes the matching passage even when it occurs late in a long sentence", () => {
    const result = analyze(
      "설명할 내용을 더 적습니다 ".repeat(30) + "너무 피곤해서 잠시 쉬고 싶다",
    );
    const fatigue = result.facts.find((f) => f.code === "fatigue");
    expect(fatigue?.excerpt).toContain("피곤");
    expect(fatigue!.excerpt.length).toBeLessThanOrEqual(96);
  });
});

describe("appeals need a new executable plan, not merely a long paragraph", () => {
  const input = {
    ...base,
    requestedMinutes: 1440 as const,
    deadlineCategory: "today" as const,
    reasonDetail: "시작할 의욕이 없다.",
  };
  const original = reviewApplication(input, now);
  it("allows a bounded new plan while explicitly refusing the original full day", () => {
    const result = reviewAppeal(
      input,
      original,
      "자료조사를 이미 완료했습니다. 10분 안에 개요를 작성하고 첫 문단에 착수하겠습니다.",
      now,
    );
    expect(result.outcome).toBe("conditional");
    expect(result.conditions.join(" ")).toContain(
      "하루 전체의 유예는 인정되지 않음",
    );
    expect(result.firstAction).toContain("개요");
  });
  it.each([
    "계획 시간 완료 일정 진행 변경 확인 ".repeat(10),
    "10분 뒤 본문을 작성할 계획이 없습니다.",
    "내일 10분 뒤 본문을 작성하겠습니다.",
    "두 시간 후 본문을 작성하겠습니다.",
    "답변이 오면 본문을 작성하겠습니다.",
  ])("maintains rejection for an inadequate appeal: %s", (reason) => {
    expect(reviewAppeal(input, original, reason, now).outcome).toBe("rejected");
  });
  it("does not reverse on an unchanged plan repeated in different words", () => {
    const repeated = {
      ...input,
      reasonDetail: "피곤하다. 10분 뒤 개요를 작성하겠습니다.",
    };
    const before = reviewApplication(repeated, now);
    const result = reviewAppeal(
      repeated,
      before,
      "피곤합니다. 열 분 후 보고서 개요를 작성하겠습니다.",
      now,
    );
    expect(result.outcome).toBe("rejected");
  });
  it("can review a legacy decision without modifying its engine or rationale", () => {
    const legacy = {
      ...original,
      engineVersion: "review-engine/1.0",
      analysis: undefined,
    };
    const copy = structuredClone(legacy);
    const result = reviewAppeal(
      input,
      legacy,
      "10분 뒤 보고서 본문을 작성하겠습니다.",
      now,
    );
    expect(result.engineVersion).toBe("review-engine/2.0");
    expect(result.outcome).toBe("conditional");
    expect(legacy).toEqual(copy);
  });
});
