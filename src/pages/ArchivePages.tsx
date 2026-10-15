import { DocumentBoundary } from "../components/ErrorBoundary";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Download,
  Upload,
  Trash2,
  Search,
  FolderOpen,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useCases } from "../storage/CaseContext";
import * as storage from "../storage/database";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Notice,
  PageHeading,
} from "../components/UI";
import { type CaseRecord, formNames, labels } from "../domain/types";
import { currentDecision } from "../domain/cases";
import { formatDate } from "../utils/time";
import { saveBlob } from "../utils/download";
import s from "../App.module.css";
const DocumentPanel = lazy(() => import("../components/DocumentPanel"));
export function CasesPage() {
  const { records, ready, refresh } = useCases();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<CaseRecord | "all">(),
    [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (deleting) dialog.current?.showModal();
    else dialog.current?.close();
  }, [deleting]);
  async function restore(selected: File | undefined) {
    if (!selected) return;
    setError("");
    setMessage("");
    if (selected.size > 25 * 1024 * 1024) {
      setError("백업 파일은 25MB 이내여야 합니다.");
      return;
    }
    setBusy(true);
    try {
      const { added, skipped } = await storage.importBackup(
        await selected.text(),
      );
      await refresh();
      setMessage(
        `${added}건을 가져왔습니다. 이미 보관 중인 ${skipped}건은 원본을 유지했습니다.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "백업을 가져올 수 없습니다.");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting === "all") {
        await storage.clearCases();
        await storage.clearDraft();
      } else await storage.removeCase(deleting.id);
      await refresh();
      setDeleting(undefined);
      setMessage("선택한 기록을 삭제했습니다.");
    } catch {
      setError("기록을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  const filtered = records.filter(
    (r) =>
      `${r.receiptNumber} ${r.applicantAlias} ${r.taskDescription}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        filter ===
          (r.status === "accepted" ? "accepted" : currentDecision(r)?.outcome)),
  );
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="전자민원 보관함"
        title="나의 민원"
        description="이 브라우저에서 접수한 민원과 처리결과를 확인할 수 있습니다."
      />
      <Notice>
        기록은 브라우저와 기기 사이에 자동으로 동기화되지 않습니다. 브라우저
        데이터를 지우기 전에 JSON 백업을 내려받아 주세요.
      </Notice>
      <div className={s.archiveTools}>
        <div>
          <Button
            secondary
            onClick={() =>
              saveBlob(
                new Blob([storage.exportBackup(records)], {
                  type: "application/json",
                }),
                `국립핑계관리청_민원백업_${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
            disabled={!records.length}
          >
            <Download size={16} />
            기록 내보내기
          </Button>
          <Button
            secondary
            onClick={() => file.current?.click()}
            disabled={busy}
          >
            <Upload size={16} />
            백업 가져오기
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className={s.srOnly}
            aria-label="JSON 백업 파일"
            onChange={(e) => void restore(e.target.files?.[0])}
          />
        </div>
        <button
          className={s.dangerButton}
          disabled={!records.length || busy}
          onClick={() => setDeleting("all")}
        >
          <Trash2 size={15} />
          전체 기록 삭제
        </button>
      </div>
      <ErrorMessage message={error} />
      {message && (
        <p className={s.successMessage} role="status">
          {message}
        </p>
      )}
      <form className={s.filterBar} onSubmit={(e) => e.preventDefault()}>
        <div>
          <Search size={18} />
          <input
            aria-label="민원 기록 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="접수번호, 신청인 또는 대상업무 검색"
          />
        </div>
        <select
          aria-label="처리상태 필터"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">모든 처리상태</option>
          <option value="accepted">접수완료</option>
          {Object.entries(labels.outcome).map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
      </form>
      <p className={s.recordCount}>
        보관 중인 민원 <strong>{records.length}</strong>건{" "}
        <span>· 검색결과 {filtered.length}건</span>
      </p>
      {!ready ? (
        <p role="status">기록을 불러오고 있습니다.</p>
      ) : !records.length ? (
        <EmptyState
          title="아직 접수한 민원이 없습니다."
          description="미루고 싶은 일에 접수번호를 부여해 보세요."
        />
      ) : !filtered.length ? (
        <div className={s.emptyState}>
          <h2>검색 조건에 맞는 민원이 없습니다.</h2>
          <button
            className={s.textButton}
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            검색 조건 초기화
          </button>
        </div>
      ) : (
        <table className={s.caseTable}>
          <thead>
            <tr>
              <th>접수일 / 접수번호</th>
              <th>대상업무</th>
              <th>처리상태</th>
              <th>조회</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => {
              const decision = currentDecision(record);
              return (
                <tr key={record.id}>
                  <td data-label="접수일">
                    <time>{formatDate(record.createdAtISO)}</time>
                    <small>{record.receiptNumber}</small>
                  </td>
                  <td data-label="대상업무">
                    <strong>{record.taskDescription}</strong>
                    <small>
                      {record.applicantAlias} ·{" "}
                      {labels.category[record.taskCategory]}
                    </small>
                  </td>
                  <td data-label="처리상태">
                    <span
                      className={`${s.status} ${decision ? (s[decision.outcome] ?? "") : ""}`}
                    >
                      {decision ? labels.outcome[decision.outcome] : "접수완료"}
                    </span>
                    {record.appeal && <small>재심사 종결</small>}
                  </td>
                  <td>
                    <Link
                      className={s.tableLink}
                      to={
                        record.status === "accepted"
                          ? `/receipt/${record.id}`
                          : `/result/${record.id}`
                      }
                    >
                      상세보기 <ArrowRight size={14} />
                    </Link>
                  </td>
                  <td>
                    <button
                      className={s.iconButton}
                      aria-label={`${record.receiptNumber} 삭제`}
                      onClick={() => setDeleting(record)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <dialog
        ref={dialog}
        className={s.dialog}
        onCancel={() => setDeleting(undefined)}
      >
        <h2>
          {deleting === "all"
            ? "모든 민원 기록을 삭제하시겠습니까?"
            : "이 민원 기록을 삭제하시겠습니까?"}
        </h2>
        <p>
          삭제한 기록은 이 브라우저에서 복원할 수 없습니다. 필요한 경우 먼저
          JSON 백업을 내려받아 주세요.
        </p>
        {deleting && deleting !== "all" && (
          <p className={s.receiptNumber}>{deleting.receiptNumber}</p>
        )}
        <div className={s.actions}>
          <Button
            secondary
            onClick={() => setDeleting(undefined)}
            disabled={busy}
          >
            취소
          </Button>
          <button
            className={s.deleteConfirm}
            onClick={() => void remove()}
            disabled={busy}
          >
            {busy ? "삭제 중…" : "기록 삭제"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
export function DocumentsPage() {
  const { records, ready } = useCases(),
    [params, setParams] = useSearchParams();
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState("");
  const record = records.find((r) => r.id === params.get("case")) ?? records[0];
  const selected =
    record?.documents.find((d) => d.code === code) ??
    record?.documents.find((d) => d.code === "F-09") ??
    record?.documents.find((d) => d.code === "F-06") ??
    record?.documents[0];
  async function zip() {
    if (!record || busy) return;
    setBusy(true);
    setError("");
    try {
      const m = await import("../documents/exporter");
      await m.downloadCaseZip(record, (done, total) =>
        setProgress(`${done} / ${total}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "서류를 발급하지 못했습니다.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  return (
    <div className={`${s.container} ${s.page}`}>
      <PageHeading
        eyebrow="전자문서관리실"
        title="발급문서"
        description="민원별로 실제 발생한 서류만 발급합니다. 원래의 문서번호와 발급일은 유지됩니다."
      />
      {!ready ? (
        <p role="status">문서 목록을 준비하고 있습니다.</p>
      ) : !record ? (
        <EmptyState
          title="발급 가능한 문서가 없습니다."
          description="민원을 접수하면 신청서와 접수증부터 발급할 수 있습니다."
        />
      ) : (
        <>
          <div className={s.documentSelector}>
            <label>
              민원 선택
              <select
                value={record.id}
                onChange={(e) => {
                  setParams({ case: e.target.value });
                  setCode("");
                }}
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.receiptNumber} · {r.taskDescription.slice(0, 35)}
                  </option>
                ))}
              </select>
            </label>
            <Button secondary onClick={() => void zip()} disabled={busy}>
              <Download size={16} />
              {busy
                ? `발급 중 ${progress}`
                : `서류 ${record.documents.length}종 일괄 ZIP`}
            </Button>
          </div>
          <ErrorMessage message={error} />
          <div className={s.documentLayout}>
            <aside className={s.documentList} aria-label="사건별 발급문서">
              {record.documents.map((doc) => (
                <button
                  key={doc.code}
                  className={
                    selected?.code === doc.code ? s.selectedDocument : ""
                  }
                  onClick={() => setCode(doc.code)}
                >
                  <FileText size={20} />
                  <span>
                    <small>{doc.code}</small>
                    <strong>{formNames[doc.code]}</strong>
                    <time>{formatDate(doc.issuedAtISO)}</time>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </aside>
            <section>
              {selected && (
                <>
                  <div className={s.sectionHead}>
                    <h2>{formNames[selected.code]}</h2>
                    <span className={s.tag}>{selected.code}</span>
                  </div>
                  <p className={s.caption}>{selected.number}</p>
                  <DocumentBoundary>
                    <Suspense
                      fallback={
                        <p role="status">문서 발급기를 불러오고 있습니다.</p>
                      }
                    >
                      <DocumentPanel
                        key={`${record.id}:${selected.id}`}
                        record={record}
                        document={selected}
                      />
                    </Suspense>
                  </DocumentBoundary>
                </>
              )}
            </section>
          </div>
        </>
      )}
      <section className={s.formCatalog}>
        <div className={s.sectionHead}>
          <h2>전자민원 서식 안내</h2>
          <span className={s.caption}>9종 · 사건 결과에 따라 발급</span>
        </div>
        <div>
          {Object.entries(formNames).map(([code, name]) => (
            <div key={code}>
              <span>{code}</span>
              <strong>{name}</strong>
              <small>
                {code === "F-01" || code === "F-02"
                  ? "민원 접수 시"
                  : code === "F-03"
                    ? "보완요구 시"
                    : code === "F-07"
                      ? "승인·조건부 승인 시"
                      : code === "F-08" || code === "F-09"
                        ? "이의신청 시"
                        : "최종 처분 시"}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
