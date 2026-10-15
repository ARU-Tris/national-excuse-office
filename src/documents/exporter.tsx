import React from "react";
import { pdf } from "@react-pdf/renderer";
import { OfficialDocument } from "./OfficialDocument";
import { registerDocumentFonts } from "./fonts";
import type { CaseRecord, DocumentRecord } from "../domain/types";
import { formNames } from "../domain/types";
import { saveBlob } from "../utils/download";
let fontReady: Promise<void> | undefined;
const blobs = new Map<string, Blob>();
const pending = new Map<string, Promise<Blob>>();
async function ensureFonts() {
  if (!fontReady)
    fontReady = (async () => {
      const base = `${import.meta.env.BASE_URL}fonts/`;
      await Promise.all(
        [
          "NotoSansKR-Regular.ttf",
          "NotoSansKR-Bold.ttf",
          "NotoSerifKR-Regular.ttf",
        ].map(async (file) => {
          const response = await fetch(base + file, { cache: "force-cache" });
          if (!response.ok)
            throw new Error(
              "문서용 한글 글꼴을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
            );
          if ((await response.arrayBuffer()).byteLength < 1000)
            throw new Error(
              "문서용 글꼴 파일이 손상되었습니다. 페이지를 새로 열어 주세요.",
            );
        }),
      );
      registerDocumentFonts(base);
    })().catch(() => {
      fontReady = undefined;
      throw new Error(
        "문서용 한글 글꼴을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    });
  await fontReady;
}
export async function createDocumentBlob(
  record: CaseRecord,
  document: DocumentRecord,
) {
  const key = `${document.id}:${document.issuedAtISO}:${document.templateVersion}`;
  if (blobs.has(key)) return blobs.get(key)!;
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    await ensureFonts();
    const blob = await pdf(
      <OfficialDocument record={record} document={document} />,
    ).toBlob();
    if (!blob.size)
      throw new Error(
        "빈 PDF가 생성되어 발급을 중단했습니다. 다시 시도해 주세요.",
      );
    blobs.set(key, blob);
    return blob;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
export async function downloadDocument(
  record: CaseRecord,
  document: DocumentRecord,
) {
  saveBlob(
    await createDocumentBlob(record, document),
    `국립핑계관리청_${formNames[document.code]}_${record.receiptNumber}.pdf`,
  );
}
export async function downloadCaseZip(
  record: CaseRecord,
  onProgress?: (done: number, total: number) => void,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let completed = 0;
  for (const document of record.documents) {
    zip.file(
      `${document.code}_${formNames[document.code]}.pdf`,
      await createDocumentBlob(record, document),
      { date: new Date(document.issuedAtISO) },
    );
    onProgress?.(++completed, record.documents.length);
  }
  saveBlob(
    await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
    `국립핑계관리청_민원서류일체_${record.receiptNumber}.zip`,
  );
}
