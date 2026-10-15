import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, Save, Check } from "lucide-react";
import {
  Button,
  PageHeading,
  Notice,
  DefinitionTable,
  ErrorMessage,
} from "../components/UI";
import { type Application, labels } from "../domain/types";
import { applicationSchema, draftSchema } from "../domain/validation";
import { createCase } from "../domain/cases";
import { useCases } from "../storage/CaseContext";
import * as storage from "../storage/database";
import { formatDate } from "../utils/time";
import s from "../App.module.css";
const defaults: Application = {
  applicantAlias: "",
  taskCategory: "study",
  taskDescription: "",
  reasonCategory: "motivation",
  reasonDetail: "",
  evidenceDetail: "",
  requestedMinutes: 30,
  deadlineCategory: "today",
  reviewMode: "strict",
};
function Field({
  id,
  title,
  children,
  required,
  error,
  hint,
  count,
}: {
  id: string;
  title: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
  count?: string;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id}>
        {title}
        {required && <sup>필수</sup>}
      </label>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {children}
      {count && <small className={s.counter}>{count}</small>}
      {error && (
        <small className={s.fieldError} id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
export default function ApplicationPage() {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const { records, ready, refresh } = useCases();
  const [input, setInput] = useState<Application>(defaults),
    [loaded, setLoaded] = useState(false),
    [saved, setSaved] = useState(""),
    [stage, setStage] = useState(1),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [consents, setConsents] = useState([false, false, false, false]);
  const submitted = useRef(false),
    draftId = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void storage
      .readDraft()
      .then((draft) => {
        if (!active) return;
        let value = defaults;
        if (draft && draftSchema.safeParse(draft.input).success) {
          value = draft.input;
          setSaved(
            `${formatDate(draft.savedAtISO, true)} 임시저장한 신청서를 불러왔습니다.`,
          );
        }
        const category = params.get("category");
        if (category && Object.hasOwn(labels.category, category))
          value = {
            ...value,
            taskCategory: category as Application["taskCategory"],
          };
        setInput(value);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
        setError(
          "임시저장 내용을 읽지 못했습니다. 현재 신청서는 새로 작성할 수 있습니다.",
        );
      });
    return () => {
      active = false;
    };
  }, [ready]);
  useEffect(() => {
    if (!loaded || submitted.current) return;
    const timer = setTimeout(() => {
      void storage
        .saveDraft(input)
        .then(() =>
          setSaved(
            `신청서 임시저장 · ${formatDate(new Date().toISOString(), true)}`,
          ),
        )
        .catch(() =>
          setError(
            "임시저장을 할 수 없습니다. 접수 후 JSON 백업을 내려받아 주세요.",
          ),
        );
    }, 700);
    return () => clearTimeout(timer);
  }, [input, loaded]);
  function change<K extends keyof Application>(key: K, value: Application[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }
  function inputProps(key: keyof Application) {
    return {
      id: key,
      name: key,
      "aria-invalid": !!errors[key],
      "aria-required": key !== "applicantAlias" && key !== "evidenceDetail",
      "aria-describedby":
        [
          [
            "applicantAlias",
            "taskDescription",
            "reasonDetail",
            "evidenceDetail",
          ].includes(key)
            ? `${key}-hint`
            : "",
          errors[key] ? `${key}-error` : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }
  function next() {
    const result = applicationSchema.safeParse(input);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues)
        nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      setError(
        "입력 내용을 확인해 주세요. 표시된 항목을 수정한 뒤 다음 단계로 이동할 수 있습니다.",
      );
      requestAnimationFrame(() =>
        document
          .getElementById(String(result.error.issues[0]?.path[0]))
          ?.focus(),
      );
      return;
    }
    setError("");
    setStage(2);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function submit() {
    if (submitted.current || !consents.slice(0, 3).every(Boolean)) return;
    submitted.current = true;
    setBusy(true);
    setError("");
    try {
      const record = createCase(
        applicationSchema.parse(input),
        consents[3],
        new Date().toISOString(),
        records.map((r) => r.receiptNumber),
        draftId.current,
      );
      await storage.addCase(record);
      await storage.clearDraft().catch(() => {});
      await refresh();
      navigate(`/receipt/${record.id}`);
    } catch (e) {
      submitted.current = false;
      setBusy(false);
      setError(
        e instanceof Error
          ? e.message
          : "접수하지 못했습니다. 다시 시도해 주세요.",
      );
    }
  }
  if (!ready || !loaded)
    return (
      <div className={`${s.container} ${s.page}`} role="status">
        신청서를 준비하고 있습니다.
      </div>
    );
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="민원서비스 · 일상업무 유예 심사"
        title={
          stage === 1
            ? "유예가 필요한 사유를 작성해 주세요."
            : "작성한 내용을 확인해 주세요."
        }
        description={
          stage === 1
            ? "짧은 사유에도 정식 절차가 필요합니다. 충분한 소명은 심사에 도움이 됩니다."
            : "접수 후에는 신청서를 수정할 수 없습니다. 보완 또는 이의신청 절차를 이용해 주세요."
        }
      />
      <ol className={s.steps}>
        {["민원 안내", "신청서 작성", "내용 확인·동의", "접수 완료"].map(
          (title, i) => (
            <li
              aria-current={i === stage ? "step" : undefined}
              className={i === stage ? s.currentStep : ""}
              key={title}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              {title}
            </li>
          ),
        )}
      </ol>
      <ErrorMessage message={error} />
      {stage === 1 ? (
        <div className={s.formLayout}>
          <form
            noValidate
            className={s.formPanel}
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <div className={s.sectionHead}>
              <h2>신청인 및 신청사항</h2>
              <span className={s.requiredNote}>필수 항목</span>
            </div>
            {saved && (
              <p className={s.draftNotice}>
                <Save size={14} />
                {saved}
              </p>
            )}
            <Field
              id="applicantAlias"
              title="신청인 표시명"
              hint="선택 · 실명 대신 별칭을 사용하세요. 비워 두면 ‘익명 신청인’으로 접수됩니다."
              error={errors.applicantAlias}
            >
              <input
                {...inputProps("applicantAlias")}
                value={input.applicantAlias}
                maxLength={30}
                onChange={(e) => change("applicantAlias", e.target.value)}
                placeholder="익명 신청인"
              />
            </Field>
            <Field id="taskCategory" title="업무 종류" required>
              <select
                {...inputProps("taskCategory")}
                value={input.taskCategory}
                onChange={(e) =>
                  change(
                    "taskCategory",
                    e.target.value as Application["taskCategory"],
                  )
                }
              >
                {Object.entries(labels.category).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="taskDescription"
              title="해야 할 일"
              required
              hint="미루고 싶은 일을 5~160자로 구체적으로 적어 주세요."
              error={errors.taskDescription}
              count={`${input.taskDescription.length} / 160`}
            >
              <input
                {...inputProps("taskDescription")}
                value={input.taskDescription}
                maxLength={160}
                onChange={(e) => change("taskDescription", e.target.value)}
                placeholder="예: 오늘 해야 할 과제를 내일로 미루고 싶다."
              />
            </Field>
            <Field id="reasonCategory" title="신청 사유 구분" required>
              <select
                {...inputProps("reasonCategory")}
                value={input.reasonCategory}
                onChange={(e) =>
                  change(
                    "reasonCategory",
                    e.target.value as Application["reasonCategory"],
                  )
                }
              >
                {Object.entries(labels.reason).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="reasonDetail"
              title="신청 사유 상세"
              required
              hint="5~1,000자 · 상황과 유예 후 수행 계획을 설명해 주세요."
              error={errors.reasonDetail}
              count={`${input.reasonDetail.length} / 1,000`}
            >
              <textarea
                {...inputProps("reasonDetail")}
                rows={5}
                value={input.reasonDetail}
                maxLength={1000}
                onChange={(e) => change("reasonDetail", e.target.value)}
                placeholder="유예가 필요한 상황과 이유를 구체적으로 적어 주세요."
              />
            </Field>
            <div className={s.twoColumns}>
              <Field id="requestedMinutes" title="희망 유예시간" required>
                <select
                  {...inputProps("requestedMinutes")}
                  value={input.requestedMinutes}
                  onChange={(e) =>
                    change(
                      "requestedMinutes",
                      Number(e.target.value) as Application["requestedMinutes"],
                    )
                  }
                >
                  {Object.entries(labels.minutes).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="deadlineCategory" title="실제 마감기한" required>
                <select
                  {...inputProps("deadlineCategory")}
                  value={input.deadlineCategory}
                  onChange={(e) =>
                    change(
                      "deadlineCategory",
                      e.target.value as Application["deadlineCategory"],
                    )
                  }
                >
                  {Object.entries(labels.deadline).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              id="evidenceDetail"
              title="부연 소명"
              hint="선택 · 추가 정황을 1,500자 이내로 적어 주세요. 파일 첨부는 받지 않습니다."
              count={`${input.evidenceDetail.length} / 1,500`}
              error={errors.evidenceDetail}
            >
              <textarea
                {...inputProps("evidenceDetail")}
                rows={4}
                value={input.evidenceDetail}
                maxLength={1500}
                onChange={(e) => change("evidenceDetail", e.target.value)}
              />
            </Field>
            <fieldset className={s.radioField}>
              <legend>
                심사 방식 <sup>필수</sup>
              </legend>
              {Object.entries(labels.mode).map(([value, label]) => (
                <label
                  key={value}
                  className={input.reviewMode === value ? s.selectedRadio : ""}
                >
                  <input
                    type="radio"
                    name="reviewMode"
                    value={value}
                    checked={input.reviewMode === value}
                    onChange={() =>
                      change("reviewMode", value as Application["reviewMode"])
                    }
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {value === "strict"
                        ? "소명과 시간의 적정성을 엄격히 검토합니다."
                        : "이행조건을 중심으로 사정을 고려합니다."}
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className={s.actions}>
              <Button secondary to="/services/defer">
                이전
              </Button>
              <Button type="submit">
                내용 확인 <ArrowRight size={18} />
              </Button>
              <button
                type="button"
                className={s.textButton}
                onClick={() =>
                  void storage
                    .saveDraft(input)
                    .then(() => setSaved("현재 신청서를 임시저장했습니다."))
                    .catch(() => setError("임시저장을 할 수 없습니다."))
                }
              >
                <Save size={16} />
                임시저장
              </button>
            </div>
          </form>
          <aside className={s.formAside}>
            <FileText size={28} />
            <h3>작성 전 확인하세요</h3>
            <p>
              희망 유예시간과 실제 마감기한은 다릅니다. 본 청은 실제 기한을
              변경할 수 없습니다.
            </p>
            <hr />
            <p>
              실명, 연락처, 주소, 건강정보 등 민감한 개인정보는 입력하지 마세요.
            </p>
            <Link to="/help?topic=review">
              심사기준 안내 <ArrowRight size={15} />
            </Link>
          </aside>
        </div>
      ) : (
        <section className={s.confirmPanel}>
          <h2>신청내용 확인</h2>
          <DefinitionTable
            rows={[
              ["신청인", input.applicantAlias || "익명 신청인"],
              ["업무 종류", labels.category[input.taskCategory]],
              ["해야 할 일", input.taskDescription],
              ["신청 사유 구분", labels.reason[input.reasonCategory]],
              ["신청 사유", input.reasonDetail],
              ["희망 유예시간", labels.minutes[input.requestedMinutes]],
              ["실제 마감기한", labels.deadline[input.deadlineCategory]],
              ["부연 소명", input.evidenceDetail || "없음"],
              ["심사 방식", labels.mode[input.reviewMode]],
            ]}
          />
          <h2>필수 확인 및 동의</h2>
          <div className={s.consentBox}>
            {[
              "[필수] 국립핑계관리청이 창작된 가상 행정기관임을 확인하였습니다.",
              "[필수] 본 심사는 오락·풍자를 위한 가상 절차이며, 실제 업무·학업 의무나 기한을 변경하지 않음을 이해하였습니다.",
              "[필수] 민원 내용과 발급 기록이 사용 중인 브라우저의 로컬 저장소에 저장됨을 확인하였습니다.",
              "[선택] 심사관의 엄중한 검토 과정에서 지나치게 장황한 문어체가 사용될 수 있음을 양해합니다.",
            ].map((text, i) => (
              <label key={text}>
                <input
                  type="checkbox"
                  checked={consents[i]}
                  onChange={(e) =>
                    setConsents((c) =>
                      c.map((v, n) => (n === i ? e.target.checked : v)),
                    )
                  }
                />
                <span>{text}</span>
              </label>
            ))}
          </div>
          <Notice>
            접수와 심사에 수수료가 발생하지 않습니다. 신청 내용은 외부로
            전송되지 않습니다.
          </Notice>
          <div className={s.actions}>
            <Button secondary onClick={() => setStage(1)}>
              내용 수정
            </Button>
            <Button
              disabled={busy || !consents.slice(0, 3).every(Boolean)}
              onClick={() => void submit()}
            >
              {busy ? (
                "접수 중…"
              ) : (
                <>
                  <Check size={17} />
                  민원 접수
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
