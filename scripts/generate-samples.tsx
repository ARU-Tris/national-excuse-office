import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import path from "node:path";
import fs from "node:fs/promises";
import { OfficialDocument } from "../src/documents/OfficialDocument";
import { registerDocumentFonts } from "../src/documents/fonts";
import { sampleCase, approvedSample } from "../src/documents/fixtures";
import type { FormCode, DocumentRecord } from "../src/domain/types";

registerDocumentFonts(path.join(process.cwd(), "public/fonts/"));
await fs.mkdir("output/pdf", { recursive: true });
await fs.mkdir("public/samples", { recursive: true });
for (const code of ["F-05", "F-06", "F-07"] as FormCode[]) {
  const record = code === "F-07" ? approvedSample : sampleCase;
  const document: DocumentRecord = {
    code,
    id: `sample-${code}`,
    number: `사유심사-2026-1015-${code.slice(2)}42호`,
    issuedAtISO: record.createdAtISO,
    templateVersion: "forms/1.0",
    decision: record.decision,
  };
  const output = path.join(process.cwd(), `output/pdf/${code}-sample.pdf`);
  await renderToFile(
    <OfficialDocument record={record} document={document} />,
    output,
  );
  await fs.copyFile(output, `public/samples/${code}-sample.pdf`);
  console.log(output);
}
