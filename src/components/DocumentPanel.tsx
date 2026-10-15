import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { CaseRecord, DocumentRecord } from "../domain/types";
import { formNames } from "../domain/types";
import { createDocumentBlob, downloadDocument } from "../documents/exporter";
import { ErrorMessage } from "./UI";
import s from "../App.module.css";
export default function DocumentPanel({
  record,
  document,
}: {
  record: CaseRecord;
  document: DocumentRecord;
}) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy>(),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [retry, setRetry] = useState(0),
    [pageText, setPageText] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true,
      objectUrl = "",
      instance: PDFDocumentProxy | undefined;
    setLoading(true);
    setError("");
    setPage(1);
    setPdfDocument(undefined);
    void (async () => {
      try {
        const blob = await createDocumentBlob(record, document);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        instance = await pdfjs.getDocument({
          data: new Uint8Array(await blob.arrayBuffer()),
        }).promise;
        if (active) {
          setPdfDocument(instance);
          setLoading(false);
        } else await instance.destroy();
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "PDF를 만들 수 없습니다. 다시 시도해 주세요.",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (instance) void instance.destroy();
    };
  }, [record.id, document.id, retry]);
  useEffect(() => {
    if (!pdfDocument) return;
    let cancelled = false,
      renderTask: { cancel: () => void } | undefined;
    void (async () => {
      try {
        const pdfPage = await pdfDocument.getPage(page);
        if (cancelled || !canvas.current) return;
        const width = Math.max(220, (host.current?.clientWidth ?? 500) - 32);
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: (width / original.width) * zoom,
        });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const target = canvas.current;
        target.width = Math.ceil(viewport.width * ratio);
        target.height = Math.ceil(viewport.height * ratio);
        target.style.width = `${viewport.width}px`;
        target.style.height = `${viewport.height}px`;
        const task = pdfPage.render({
          canvas: target,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        renderTask = task;
        await task.promise;
        const text = await pdfPage.getTextContent();
        if (!cancelled)
          setPageText(
            text.items.map((item) => ("str" in item ? item.str : "")).join(" "),
          );
      } catch (e) {
        if (
          !cancelled &&
          e instanceof Error &&
          e.name !== "RenderingCancelledException"
        )
          setError(
            "미리보기를 표시하지 못했습니다. 아래 PDF 내려받기를 이용해 주세요.",
          );
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDocument, page, zoom]);
  return (
    <div className={s.documentPanel}>
      <div className={s.documentToolbar}>
        <span>{document.code} · A4</span>
        <div>
          <button
            aria-label="미리보기 축소"
            onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
            disabled={!pdfDocument || zoom <= 0.65}
          >
            <ZoomOut size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="미리보기 확대"
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            disabled={!pdfDocument || zoom >= 2}
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <div className={s.pdfCanvasHost} ref={host} aria-busy={loading}>
        {loading && <p role="status">한글 글꼴과 문서를 준비하고 있습니다.</p>}
        <ErrorMessage message={error} />
        {error && (
          <button
            className={s.textButton}
            onClick={() => setRetry((r) => r + 1)}
          >
            <RotateCcw size={15} />
            다시 시도
          </button>
        )}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${formNames[document.code]} ${page}페이지`}
          hidden={loading || !!error}
        />
        <div className={s.srOnly}>{pageText}</div>
      </div>
      <div className={s.pdfPagination}>
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={!pdfDocument || page === 1}
          aria-label="이전 PDF 페이지"
        >
          <ChevronLeft size={17} />
        </button>
        <span aria-live="polite">
          {page} / {pdfDocument?.numPages ?? "–"}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!pdfDocument || page === (pdfDocument?.numPages ?? 1)}
          aria-label="다음 PDF 페이지"
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className={s.actions}>
        <button
          className={s.button}
          disabled={loading}
          onClick={() =>
            void downloadDocument(record, document).catch((e) =>
              setError(String(e.message)),
            )
          }
        >
          <Download size={17} />
          PDF 내려받기
        </button>
        {url && (
          <a
            className={`${s.button} ${s.secondary}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            title="인쇄용 PDF를 새 창에서 열기"
          >
            <Printer size={17} />
            인쇄
          </a>
        )}
      </div>
      <p className={s.caption}>
        미리보기와 내려받기는 같은 PDF를 사용합니다. 인쇄 시 A4·실제
        크기(100%)를 선택하세요.
      </p>
    </div>
  );
}
