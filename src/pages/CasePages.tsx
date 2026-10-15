import { DocumentBoundary } from "../components/ErrorBoundary";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  DefinitionTable,
  EmptyState,
  ErrorMessage,
  Notice,
  PageHeading,
} from "../components/UI";
import { useCases } from "../storage/CaseContext";
import { changeCase } from "../storage/database";
import {
  currentDecision,
  reviewCase,
  supplementCase,
  appealCase,
} from "../domain/cases";
import { type CaseRecord, labels } from "../domain/types";
import { formatDate } from "../utils/time";
import s from "../App.module.css";
const DocumentPanel = lazy(() => import("../components/DocumentPanel"));
function useCase() {
  const { id } = useParams();
  const context = useCases();
  return { ...context, record: context.records.find((r) => r.id === id) };
}
export function MissingCase() {
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading title="민원 기록을 찾을 수 없습니다." />
      <Notice>
        이 브라우저에서 접수한 민원만 조회할 수 있습니다. 다른 브라우저의 사건은
        JSON 백업을 가져온 뒤 다시 열어 주세요.
      </Notice>
      <Button to="/my-cases">나의 민원으로 이동</Button>
    </div>
  );
}
function Loading() {
  return (
    <div className={`${s.container} ${s.page}`} role="status">
      민원 기록을 불러오고 있습니다.
    </div>
  );
}
export function ReceiptPage() {
  const { record, ready, refresh } = useCase(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  if (!ready) return <Loading />;
  if (!record) return <MissingCase />;
  async function start() {
    if (busy || !record) return;
    setBusy(true);
    try {
      await changeCase(record.id, (r) =>
        reviewCase(r, new Date().toISOString()),
      );
      await refresh();
      navigate(`/processing/${record.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "심사를 시작하지 못했습니다.");
      setBusy(false);
    }
  }
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="민원 접수 완료"
        title="귀하의 사유가 행정적으로 존재하게 되었습니다."
        description="일상업무 유예 심사 신청이 정상적으로 접수되었습니다."
      />
      <div className={s.receiptCard}>
        <CheckCircle2 size={45} strokeWidth={1.5} />
        <span>전자민원 접수번호</span>
        <strong>{record.receiptNumber}</strong>
        <button
          className={s.textButton}
          onClick={() =>
            void navigator.clipboard
              .writeText(record.receiptNumber)
              .then(() => setCopied(true))
              .catch(() =>
                setError(
                  "번호를 복사하지 못했습니다. 접수번호를 직접 선택하여 복사해 주세요.",
                ),
              )
          }
        >
          <ClipboardCopy size={15} />
          {copied ? "복사했습니다" : "접수번호 복사"}
        </button>
      </div>
      <section className={s.narrowSection}>
        <DefinitionTable
          rows={[
            ["신청인", record.applicantAlias],
            ["민원명", "일상업무 유예 심사"],
            ["대상업무", record.taskDescription],
            ["접수일시", `${formatDate(record.createdAtISO, true)} (서울)`],
            ["처리기관", "민원접수국 전자민원접수과"],
          ]}
        />
        <Notice>
          심사 시작을 누르면 규칙 기반 프로그램이 제출 내용을 검토합니다.
          접수증은 심사 이전에도 발급할 수 있습니다.
        </Notice>
        <ErrorMessage message={error} />
        <div className={s.actions}>
          <Button onClick={() => void start()} disabled={busy}>
            {busy ? "심사 준비 중…" : "심사 시작"}
            <ArrowRight size={17} />
          </Button>
          <Button
            secondary
            onClick={() =>
              void import("../documents/exporter")
                .then((m) =>
                  m.downloadDocument(
                    record,
                    record.documents.find((d) => d.code === "F-02")!,
                  ),
                )
                .catch((e) => setError(e.message))
            }
          >
            <Download size={17} />
            접수증 발급
          </Button>
          <Button secondary to="/my-cases">
            나의 민원
          </Button>
        </div>
      </section>
    </div>
  );
}
export function ProcessingPage() {
  const { record, ready } = useCase(),
    navigate = useNavigate();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!record) return;
    if (!record.decision) {
      navigate(`/receipt/${record.id}`, { replace: true });
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(`/result/${record.id}`, { replace: true });
      return;
    }
    let index = 0;
    const timer = setInterval(() => {
      index++;
      setStep(index);
      if (index >= 4) {
        clearInterval(timer);
        navigate(`/result/${record.id}`, { replace: true });
      }
    }, 650);
    return () => clearInterval(timer);
  }, [record?.id, !!record?.decision]);
  if (!ready) return <Loading />;
  if (!record) return <MissingCase />;
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="민원 심사 · 프로그램 시뮬레이션"
        title="귀하의 사유를 엄정하게 검토하고 있습니다."
        description={record.receiptNumber}
      />
      <div className={s.processingLayout}>
        <img src={`${import.meta.env.BASE_URL}brand/emblem.svg`} alt="" />
        <ol className={s.reviewTimeline}>
          {[
            ["신청 내용 검토", "전자민원접수과 · 필수 항목 및 접수 적합성"],
            ["사유 타당성 검토", "제1사유심사과 · 구체성과 유예 적정성"],
            ["처분안 작성", "유예결정과 · 심사 의견과 이행조건"],
            ["결재 완료", "전자문서관리실 · 문서번호 부여"],
          ].map(([title, description], i) => (
            <li
              key={title}
              aria-current={i === step ? "step" : undefined}
              className={i <= step ? s.timelineActive : ""}
            >
              <span>
                {i < step ? (
                  <Check size={17} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <Notice>
        실존 공무원의 심사가 아닌 프로그램 연출입니다. 판정은 이미 고정되어
        있으며 새로고침해도 바뀌지 않습니다.
      </Notice>
      <Button secondary to={`/result/${record.id}`}>
        심사 연출 건너뛰기 <ArrowRight size={16} />
      </Button>
    </div>
  );
}
export function ResultPage() {
  const { record, ready } = useCase();
  const [zipBusy, setZipBusy] = useState(false),
    [zipProgress, setZipProgress] = useState(""),
    [error, setError] = useState("");
  if (!ready) return <Loading />;
  if (!record) return <MissingCase />;
  const decision = currentDecision(record);
  if (!decision)
    return (
      <div className={`${s.container} ${s.page}`}>
        <PageHeading title="접수한 민원의 심사를 시작해 주세요." />
        <Button to={`/receipt/${record.id}`}>접수내용 확인</Button>
      </div>
    );
  const outcome = decision.outcome,
    doc = record.documents.find(
      (d) =>
        d.code ===
        (record.appeal
          ? "F-09"
          : outcome === "supplement_requested"
            ? "F-03"
            : "F-06"),
    );
  const headline =
    outcome === "rejected"
      ? "제출하신 사유로 유예를 인정하기 곤란합니다."
      : outcome === "supplement_requested"
        ? "판단에 필요한 추가 소명을 요청합니다."
        : outcome === "approved"
          ? "신청하신 일상업무의 유예를 승인합니다."
          : "이행조건을 부가하여 유예를 승인합니다.";
  async function zip() {
    if (zipBusy || !record) return;
    setZipBusy(true);
    try {
      const m = await import("../documents/exporter");
      await m.downloadCaseZip(record, (done, total) =>
        setZipProgress(`${done} / ${total}`),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "문서 발급을 완료하지 못했습니다.",
      );
    } finally {
      setZipBusy(false);
      setZipProgress("");
    }
  }
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow={
          record.appeal ? "나의 민원 · 재심사 결과" : "나의 민원 · 처리결과"
        }
        title={
          outcome === "supplement_requested"
            ? "신청하신 민원의 보완이 필요합니다."
            : "신청하신 민원의 심사가 완료되었습니다."
        }
        description={`${record.receiptNumber} · ${formatDate(decision.decidedAtISO, true)}`}
      />
      <div className={s.resultBanner}>
        <span className={`${s.status} ${s[outcome] ?? ""}`}>
          {labels.outcome[outcome]}
        </span>
        <div>
          <h2>{headline}</h2>
          <p>
            {record.appeal
              ? "이의신청에 대한 재심사 결과를 통지합니다."
              : "귀하의 사유를 검토하였으며, 다음과 같이 결과를 통지합니다."}
          </p>
        </div>
        <img src={`${import.meta.env.BASE_URL}brand/emblem.svg`} alt="" />
      </div>
      <div className={s.resultGrid}>
        <section>
          <h2>
            {outcome === "supplement_requested" ? "보완 요청사항" : "심사 의견"}
          </h2>
          {decision.rationale.map((reason, i) => (
            <p className={s.reasonLine} key={i}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              {reason}
            </p>
          ))}
          {outcome !== "supplement_requested" && (
            <div className={s.firstAction}>
              <Check size={21} />
              <div>
                <strong>향후 이행 권고 · 첫 번째 행동</strong>
                <p>{decision.firstAction}</p>
              </div>
            </div>
          )}
          {decision.conditions.length > 0 && (
            <>
              <h3>이행조건</h3>
              <ul className={s.proseList}>
                {decision.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
          <DefinitionTable
            rows={[
              ["대상업무", record.taskDescription],
              ["신청인", record.applicantAlias],
              ["희망 유예", labels.minutes[record.requestedMinutes]],
              ["심사 방식", labels.mode[record.reviewMode]],
              [
                "담당부서",
                record.appeal ? "재심사조정실" : "생활사유심사국 제1사유심사과",
              ],
            ]}
          />
          <h3>다음 절차</h3>
          {outcome === "supplement_requested" ? (
            <>
              <p className={s.muted}>
                추가 텍스트 소명을 1회 제출할 수 있습니다. 보완 후에는 최종
                처분을 진행합니다.
              </p>
              <Button to={`/supplement/${record.id}`}>
                보완자료 제출 <ArrowRight size={16} />
              </Button>
            </>
          ) : outcome === "rejected" && !record.appeal ? (
            <>
              <p className={s.muted}>
                새로운 사실이나 이행계획이 있으면 1회 이의신청을 할 수 있습니다.
              </p>
              <Button secondary to={`/appeal/${record.id}`}>
                이의신청
              </Button>
            </>
          ) : (
            <p className={s.muted}>
              {record.appeal
                ? "본 사건의 1회 이의신청 절차가 종결되었습니다."
                : "유예 종료 후 위의 첫 행동을 수행해 주세요."}
            </p>
          )}
          <div className={s.actions}>
            <Button secondary to={`/documents?case=${record.id}`}>
              관련서류 {record.documents.length}종 <FileText size={16} />
            </Button>
            <Button secondary onClick={() => void zip()} disabled={zipBusy}>
              <Download size={16} />
              {zipBusy ? `문서 준비 중 ${zipProgress}` : "서류 일괄 ZIP 발급"}
            </Button>
          </div>
          <ErrorMessage message={error} />
          <p className={s.caption}>
            사건의 원래 신청일과 결정 내용은 재발급해도 유지됩니다.
          </p>
        </section>
        <section>
          {doc && (
            <>
              <div className={s.sectionHead}>
                <h2>
                  {record.appeal
                    ? "재심사 결과 통지서"
                    : outcome === "supplement_requested"
                      ? "사유 보완요구서"
                      : "처리결과 통지서"}
                </h2>
                <span className={s.tag}>{doc.code} · PDF</span>
              </div>
              <DocumentBoundary>
                <Suspense
                  fallback={
                    <p role="status">문서 발급기를 불러오고 있습니다.</p>
                  }
                >
                  <DocumentPanel record={record} document={doc} />
                </Suspense>
              </DocumentBoundary>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
export function ResponsePage({ appeal = false }: { appeal?: boolean }) {
  const { record, ready, refresh } = useCase(),
    navigate = useNavigate();
  const [purpose, setPurpose] = useState("원처분의 변경을 요청합니다."),
    [reason, setReason] = useState(""),
    [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  if (!ready) return <Loading />;
  if (!record) return <MissingCase />;
  const allowed = appeal
    ? record.decision?.outcome === "rejected" && !record.appeal
    : record.status === "supplement_requested" && !record.supplement?.response;
  async function submit() {
    if (submitted.current || !record || !consent) return;
    setError("");
    setBusy(true);
    submitted.current = true;
    try {
      await changeCase(record.id, (r) =>
        appeal
          ? appealCase(r, purpose, reason, new Date().toISOString())
          : supplementCase(r, reason, new Date().toISOString()),
      );
      await refresh();
      navigate(`/processing/${record.id}`);
    } catch (e) {
      submitted.current = false;
      setBusy(false);
      setError(
        e instanceof Error
          ? e.message
          : "제출하지 못했습니다. 입력 내용을 확인해 주세요.",
      );
    }
  }
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow={`나의 민원 · ${record.receiptNumber}`}
        title={appeal ? "처분에 대한 이의신청" : "보완자료 제출"}
        description={
          appeal
            ? "원처분을 변경할 새로운 사실과 구체적인 이행계획을 적어 주세요."
            : "심사에 필요한 정황과 유예 후의 수행계획을 추가로 설명해 주세요."
        }
      />
      {!allowed ? (
        <>
          <Notice>
            이 사건에서 {appeal ? "이의신청" : "보완자료 제출"}을 진행할 수
            없습니다. 해당 절차는 각 1회만 이용할 수 있습니다.
          </Notice>
          <Button to={`/result/${record.id}`}>처리결과 확인</Button>
        </>
      ) : (
        <form
          className={s.narrowSection}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DefinitionTable
            rows={[
              ["원 접수번호", record.receiptNumber],
              ["대상업무", record.taskDescription],
              ["현재 처분", labels.outcome[record.decision!.outcome]],
            ]}
          />
          {appeal && (
            <label className={s.field}>
              이의신청 취지 <sup>필수</sup>
              <input
                value={purpose}
                minLength={5}
                maxLength={300}
                required
                onChange={(e) => setPurpose(e.target.value)}
              />
            </label>
          )}
          <label className={s.field}>
            {appeal ? "새롭게 제출하는 사실 및 근거" : "추가 소명"}{" "}
            <sup>필수</sup>
            <small>
              10~1,500자 · 실제 파일이나 민감한 개인정보는 제출하지 마세요.
            </small>
            <textarea
              rows={8}
              value={reason}
              required
              minLength={10}
              maxLength={1500}
              onChange={(e) => setReason(e.target.value)}
            />
            <small className={s.counter}>{reason.length} / 1,500</small>
          </label>
          <div className={s.consentBox}>
            <label>
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                제출 후에는 내용을 수정할 수 없으며 본 절차가 1회로 제한됨을
                확인합니다. 가상 심사이며 실제 의무를 변경하지 않음에
                동의합니다.
              </span>
            </label>
          </div>
          <ErrorMessage message={error} />
          <div className={s.actions}>
            <Button secondary to={`/result/${record.id}`}>
              취소
            </Button>
            <Button type="submit" disabled={busy || !consent}>
              {busy ? "접수 중…" : appeal ? "이의신청 접수" : "보완자료 접수"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
