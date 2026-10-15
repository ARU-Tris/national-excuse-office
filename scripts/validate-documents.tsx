import React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { renderToFile } from "@react-pdf/renderer";
import { OfficialDocument } from "../src/documents/OfficialDocument";
import { registerDocumentFonts } from "../src/documents/fonts";
import { sampleCase } from "../src/documents/fixtures";
import {
  createCase,
  reviewCase,
  supplementCase,
  appealCase,
} from "../src/domain/cases";
import { type CaseRecord, type FormCode } from "../src/domain/types";
const now = "2026-10-15T01:15:00.000Z";
registerDocumentFonts(path.join(process.cwd(), "public/fonts/"));
await fs.mkdir("output/pdf/validation", { recursive: true });
const rejected = reviewCase(
  createCase(
    { ...sampleCase, reasonDetail: "시작할 의욕이 없다." },
    false,
    now,
  ),
  now,
);
const approved = reviewCase(
  createCase(
    {
      ...sampleCase,
      deadlineCategory: "none",
      requestedMinutes: 10,
      reasonDetail:
        "오전 내내 정리를 진행하였습니다. 10분간 휴식을 취한 뒤 책상 위 물건부터 차례로 정리하고 남은 서류를 분류하겠습니다.",
    },
    false,
    now,
  ),
  now,
);
const requested = reviewCase(
  createCase({ ...sampleCase, deadlineCategory: "unknown" }, false, now),
  now,
);
const supplemented = supplementCase(
  requested,
  "마감기한을 확인한 뒤 계획을 조정하고 10분 동안 준비하여 첫 번째 작업에 착수하겠습니다.",
  now,
);
const appealed = appealCase(
  rejected,
  "새로운 사실을 반영한 처분 변경을 요청합니다.",
  "과제 관련 자료조사를 이미 완료했습니다. 새롭게 확인한 일정에 따라 10분 동안 개요를 작성하고 이후 첫 문단에 즉시 착수하는 구체적인 이행계획을 제출합니다.",
  now,
);
const forms: Record<FormCode, CaseRecord> = {
  "F-01": rejected,
  "F-02": rejected,
  "F-03": supplemented,
  "F-04": rejected,
  "F-05": rejected,
  "F-06": rejected,
  "F-07": approved,
  "F-08": appealed,
  "F-09": appealed,
};
for (const [code, record] of Object.entries(forms)) {
  const document = record.documents.find((d) => d.code === code)!;
  await renderToFile(
    <OfficialDocument record={record} document={document} />,
    `output/pdf/validation/${code}.pdf`,
  );
}
const long = reviewCase(
  createCase(
    {
      ...sampleCase,
      reasonDetail:
        "한글 장문, 漢字, 韓國, English 123, (가), % / & 등의 조판을 확인합니다. 유예 후에는 첫 번째 업무에 착수하겠습니다.\n"
          .repeat(20)
          .slice(0, 1000),
      evidenceDetail:
        "제출한 사유와 수행계획을 다시 확인합니다. 이 문장은 장문 자동 페이지 분할 검증용 입력입니다.\n"
          .repeat(35)
          .slice(0, 1500),
    },
    false,
    now,
  ),
  now,
);
await renderToFile(
  <OfficialDocument
    record={long}
    document={long.documents.find((d) => d.code === "F-06")!}
  />,
  `output/pdf/validation/F-06-long.pdf`,
);
console.log(
  "Generated all nine occurred forms and long Korean/mixed-script pagination evidence.",
);
