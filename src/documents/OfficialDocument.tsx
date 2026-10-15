import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Svg,
  Path,
  G,
  StyleSheet,
} from "@react-pdf/renderer";
import artwork from "../brand/artwork.json";
import {
  type CaseRecord,
  type DocumentRecord,
  type Decision,
  formNames,
  labels,
} from "../domain/types";
import { formatDate } from "../utils/time";
import { documentTokens as t, mm } from "./tokens";

const s = StyleSheet.create({
  page: {
    paddingTop: t.margin.top,
    paddingHorizontal: t.margin.horizontal,
    paddingBottom: t.margin.bottom,
    fontFamily: "AgencySans",
    fontSize: t.body,
    color: t.ink,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    marginBottom: 18,
  },
  agency: {
    fontSize: t.agency,
    fontWeight: 700,
    letterSpacing: 4,
    color: t.navy,
  },
  strap: { fontSize: 8, color: t.gray, letterSpacing: 1.1, marginTop: 2 },
  meta: { flexDirection: "row", marginBottom: 5, alignItems: "flex-start" },
  label: { width: 48, fontWeight: 700, fontSize: 10 },
  metaValue: { flex: 1, fontSize: 10 },
  subject: {
    flexDirection: "row",
    borderBottomWidth: 1.4,
    borderBottomColor: t.ink,
    paddingBottom: 10,
    marginBottom: 16,
  },
  subjectValue: { flex: 1, fontWeight: 700, fontSize: 12 },
  p: {
    fontFamily: "AgencySerif",
    fontSize: t.body,
    lineHeight: t.leading,
    marginBottom: 8,
    orphans: 2,
    widows: 2,
  },
  sectionTitle: { fontWeight: 700, marginBottom: 4, marginTop: 7 },
  sub: {
    fontFamily: "AgencySerif",
    fontSize: t.body,
    lineHeight: t.leading,
    marginBottom: 5,
    paddingLeft: 12,
    orphans: 2,
    widows: 2,
  },
  table: {
    marginTop: 4,
    marginBottom: 9,
    borderTopWidth: 1,
    borderTopColor: t.line,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a6abb0",
    minHeight: 27,
  },
  cellLabel: {
    width: 90,
    backgroundColor: "#f1f3f5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 9.5,
    fontWeight: 700,
  },
  cell: { flex: 1, paddingVertical: 6, paddingHorizontal: 11, fontSize: 10 },
  sender: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    marginBottom: 5,
    minHeight: mm(26),
    gap: 8,
  },
  senderName: { fontSize: 19, fontWeight: 700, letterSpacing: 2 },
  footer: {
    position: "absolute",
    bottom: mm(12),
    height: 48,
    left: t.margin.horizontal,
    right: t.margin.horizontal,
    borderTopWidth: 0.7,
    borderTopColor: t.line,
    paddingTop: 7,
    fontSize: t.metadata,
    color: t.gray,
  },
  footerLine: { flexDirection: "row", justifyContent: "space-between" },
  title: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 17,
    letterSpacing: 0.5,
  },
  small: { fontSize: 9, color: t.gray },
  approval: {
    alignSelf: "flex-end",
    width: 270,
    marginBottom: 14,
    borderWidth: 0.7,
    borderColor: t.line,
  },
  approvalRow: { flexDirection: "row" },
  approvalCell: {
    width: 90,
    textAlign: "center",
    fontSize: 9,
    paddingVertical: 5,
    borderRightWidth: 0.5,
    borderRightColor: t.line,
  },
  approvalHeading: {
    backgroundColor: "#f1f3f5",
    borderBottomWidth: 0.5,
    borderBottomColor: t.line,
  },
  draftMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    fontSize: 9,
    color: t.gray,
  },
});

export function Emblem({
  size = 35,
  watermark = false,
}: {
  size?: number;
  watermark?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill={t.navy} opacity={watermark ? 0.035 : 1}>
        {artwork.emblemPaths.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
    </Svg>
  );
}
function Seal() {
  return (
    <Svg width={t.sealSize} height={t.sealSize} viewBox="0 0 100 100">
      <G fill={t.seal}>
        <Path d={artwork.sealBorder} fillRule="evenodd" />
        {artwork.sealGlyphs.map((p, i) => (
          <Path key={i} d={p.d} transform={p.transform} />
        ))}
      </G>
      <G fill="#fff">
        {artwork.sealCuts.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
    </Svg>
  );
}
function Header() {
  return (
    <View style={s.header}>
      <Emblem size={39} />
      <View>
        <Text style={s.agency}>국립핑계관리청</Text>
        <Text style={s.strap}>모든 사유에는 접수번호가 부여됩니다.</Text>
      </View>
    </View>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cell}>{value}</Text>
    </View>
  );
}
function Table({ rows }: { rows: [string, string][] }) {
  return (
    <View style={s.table}>
      {rows.map(([label, value], i) => (
        <Row key={i} label={label} value={value} />
      ))}
    </View>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={s.sectionTitle} minPresenceAhead={35}>
        {title}
      </Text>
      {children}
    </View>
  );
}
function Para({
  children,
  sub = false,
}: {
  children: React.ReactNode;
  sub?: boolean;
}) {
  return <Text style={sub ? s.sub : s.p}>{children}</Text>;
}
function Approval({ date }: { date: string }) {
  return (
    <View style={s.approval} wrap={false}>
      <View style={[s.approvalRow, s.approvalHeading]}>
        {["기안 · 가상 심사관", "검토 · 가상 과장", "결재 · 가상 국장"].map(
          (label) => (
            <Text key={label} style={s.approvalCell}>
              {label}
            </Text>
          ),
        )}
      </View>
      <View style={s.approvalRow}>
        {["기안완료", "검토완료", "결재완료"].map((label) => (
          <View key={label} style={s.approvalCell}>
            <Text>{label}</Text>
            <Text style={{ fontSize: 8, marginTop: 4 }}>
              {formatDate(date, true)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
function Sender() {
  return (
    <View style={s.sender} wrap={false}>
      <Text style={s.senderName}>국립핑계관리청장</Text>
      <Seal />
    </View>
  );
}
const alphabet = ["가", "나", "다", "라", "마", "바"];

function Subject({ record, title }: { record: CaseRecord; title: string }) {
  return (
    <>
      <View style={s.meta}>
        <Text style={s.label}>수 신</Text>
        <Text style={s.metaValue}>{record.applicantAlias} 귀하</Text>
      </View>
      <View style={s.subject}>
        <Text style={s.label}>제 목</Text>
        <Text style={s.subjectValue}>{title}</Text>
      </View>
    </>
  );
}
function SubmittedDetails({ record }: { record: CaseRecord }) {
  return (
    <>
      <Para sub>신청 사유: {record.reasonDetail}</Para>
      {record.evidenceDetail && (
        <Para sub>부연 소명: {record.evidenceDetail}</Para>
      )}
      {record.supplement?.response && (
        <Para sub>보완 제출: {record.supplement.response}</Para>
      )}
    </>
  );
}

function ApplicationBody({
  record,
  document,
}: {
  record: CaseRecord;
  document: DocumentRecord;
}) {
  const appeal = document.code === "F-08";
  return (
    <>
      <Text style={s.small}>[전자민원 서식 {document.code}]</Text>
      <Text style={s.title}>{formNames[document.code]}</Text>
      <Table
        rows={[
          ["접수번호", record.receiptNumber],
          ["신청인", record.applicantAlias],
          ["민원종류", "일상업무 유예 심사"],
          ["대상업무", record.taskDescription],
          ["유예시간", labels.minutes[record.requestedMinutes]],
          ["실제 마감", labels.deadline[record.deadlineCategory]],
          ["심사방식", labels.mode[record.reviewMode]],
          ...((appeal
            ? [
                ["원처분", "불승인"],
                [
                  "원처분 번호",
                  record.documents.find((d) => d.code === "F-06")?.number ?? "",
                ],
              ]
            : []) as [string, string][]),
        ]}
      />
      {appeal ? (
        <>
          <Section title="1. 이의신청 취지">
            <Para>{record.appeal?.purpose}</Para>
          </Section>
          <Section title="2. 새롭게 제출하는 사실 및 근거">
            <Para>{record.appeal?.reason}</Para>
          </Section>
        </>
      ) : (
        <>
          <Section title="1. 신청 사유">
            <Para>{record.reasonDetail}</Para>
          </Section>
          {record.evidenceDetail && (
            <Section title="2. 부연 소명">
              <Para>{record.evidenceDetail}</Para>
            </Section>
          )}
        </>
      )}
      <View wrap={false} style={{ marginTop: 20 }}>
        <Para>
          위와 같이 {appeal ? "이의신청" : "일상업무 유예 심사"}을 전자적으로
          신청합니다.
        </Para>
        <Para>
          본 신청은 가상의 행정 절차이며 실제 업무·학업 의무나 기한을 변경하지
          않음을 확인합니다.
        </Para>
        <Text style={{ textAlign: "right", marginTop: 12 }}>
          {formatDate(document.issuedAtISO)}
        </Text>
        <Text style={{ textAlign: "right", marginTop: 10 }}>
          신청인: {record.applicantAlias} (전자 신청)
        </Text>
        <Text style={{ fontWeight: 700, marginTop: 25 }}>
          국립핑계관리청 {appeal ? "재심사조정실" : "전자민원접수과"} 귀중
        </Text>
      </View>
    </>
  );
}
function ReceiptBody({ record }: { record: CaseRecord }) {
  return (
    <>
      <Text style={s.title}>전자민원 접수증</Text>
      <Para>귀하께서 제출하신 민원이 아래와 같이 접수되었음을 확인합니다.</Para>
      <Table
        rows={[
          ["접수번호", record.receiptNumber],
          ["접수일시", `${formatDate(record.createdAtISO, true)} (Asia/Seoul)`],
          ["민원명", "일상업무 유예 심사"],
          ["신청인", record.applicantAlias],
          ["대상업무", record.taskDescription],
          ["유예시간", labels.minutes[record.requestedMinutes]],
          ["처리기관", "민원접수국 전자민원접수과"],
          ["처리방법", "규칙 기반 심사 및 전자문서 발급"],
          ["수수료", "없음"],
        ]}
      />
      <Section title="접수 이후 절차">
        <Para>
          1. 신청내용 검토 → 사유 타당성 검토 → 처분안 작성 → 결재 및 결과 통지.
        </Para>
        <Para>
          2. 판단정보가 충분하지 않을 때에는 1회 보완자료 제출을 요청할 수
          있습니다.
        </Para>
        <Para>
          3. 본 접수는 유예의 승인을 의미하지 않습니다. 처리결과는 같은
          브라우저의 나의 민원에서 확인할 수 있습니다. 끝.
        </Para>
      </Section>
      <View wrap={false} style={{ marginTop: 26, alignItems: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: 700, color: t.navy }}>
          전자민원 접수 확인
        </Text>
        <Text style={{ fontSize: 9, marginTop: 7 }}>
          국립핑계관리청 민원접수국 · 프로그램 자동 접수
        </Text>
      </View>
    </>
  );
}
function SupplementBody({
  record,
  decision,
}: {
  record: CaseRecord;
  decision: Decision;
}) {
  return (
    <>
      <Subject record={record} title="일상업무 유예신청 사유 보완요구" />
      <Para>
        1. 귀하의 일상업무 유예신청에 관하여, 사유심사 운영규정 제4조에 따라
        다음의 보완사항을 안내합니다.
      </Para>
      <Table
        rows={[
          ["접수번호", record.receiptNumber],
          ["대상업무", record.taskDescription],
          ["제출방법", "나의 민원 → 보완자료 제출"],
          ["보완횟수", "1회 · 추가 텍스트 소명"],
        ]}
      />
      <Section title="2. 보완이 필요한 사항">
        {decision.rationale.map((r, i) => (
          <Para sub key={i}>
            {alphabet[i] ?? "바"}. {r}
          </Para>
        ))}
      </Section>
      <Section title="3. 제출 안내">
        <Para sub>
          가. 실제 마감에 관한 정황, 유예 요청 시간의 근거, 유예 후 수행계획을
          10~1,500자의 텍스트로 제출하여 주시기 바랍니다.
        </Para>
        <Para sub>
          나. 실제 개인정보나 증빙 파일은 제출하지 마십시오. 본 절차에서는
          파일을 접수하지 않습니다.
        </Para>
        <Para sub>
          다. 보완자료 1회 제출 후에는 제출된 내용에 따라 최종 처분합니다. 끝.
        </Para>
      </Section>
      <Sender />
    </>
  );
}
function AppealNoticeBody({
  record,
  decision,
}: {
  record: CaseRecord;
  decision: Decision;
}) {
  return (
    <>
      <Subject
        record={record}
        title="일상업무 유예신청 이의신청 심사결과 통지"
      />
      <Para>
        1. 귀하께서 제출한 이의신청에 대하여 재심사조정실의 심사 결과를 다음과
        같이 통지합니다.
      </Para>
      <Table
        rows={[
          ["접수번호", record.receiptNumber],
          [
            "원처분 번호",
            record.documents.find((d) => d.code === "F-06")?.number ?? "",
          ],
          ["원처분 결과", "불승인"],
          ["재심사 결과", labels.outcome[decision.outcome]],
          [
            "처분 변경",
            decision.outcome === "rejected"
              ? "원처분 유지"
              : "원처분을 조건부 승인으로 변경",
          ],
        ]}
      />
      <Section title="2. 이의신청 취지 및 새로운 소명">
        <Para sub>가. 신청 취지: {record.appeal?.purpose}</Para>
        <Para sub>나. 새로 제출된 사실: {record.appeal?.reason}</Para>
      </Section>
      <Section title="3. 판단이유">
        {decision.rationale.map((r, i) => (
          <Para sub key={i}>
            {alphabet[i] ?? "바"}. {r}
          </Para>
        ))}
      </Section>
      <View wrap={false}>
        <Section title="4. 향후 안내">
          <Para sub>가. {decision.firstAction}</Para>
          {decision.conditions.map((r, i) => (
            <Para sub key={i}>
              {alphabet[i + 1] ?? "다"}. {r}
            </Para>
          ))}
          <Para sub>
            본 사건의 1회 이의신청 절차는 종결되었습니다. 실제 외부의 의무와
            기한은 변경되지 않습니다. 끝.
          </Para>
        </Section>
        <Sender />
      </View>
    </>
  );
}

function ApprovalNoticeBody({
  record,
  document,
  decision,
}: {
  record: CaseRecord;
  document: DocumentRecord;
  decision: Decision;
}) {
  return (
    <>
      <Subject record={record} title="일상업무 유예승인 결정통지" />
      <Para>
        1. 귀하의 일상업무 유예신청에 대하여 다음과 같이 승인 결정사항을
        통지합니다.
      </Para>
      <Table
        rows={[
          ["승인번호", document.number],
          ["유예대상", record.taskDescription],
          ["승인결과", labels.outcome[decision.outcome]],
          [
            "인정범위",
            decision.approvedScope ??
              `신청한 개인적 업무의 착수 준비시간 ${labels.minutes[record.requestedMinutes]}`,
          ],
          [
            decision.analysis ? "검토한 마감" : "실제 마감",
            labels.deadline[
              decision.analysis?.deadline.value ?? record.deadlineCategory
            ],
          ],
        ]}
      />
      <Section title="2. 처분 사유">
        {decision.rationale.map((r, i) => (
          <Para sub key={i}>
            {alphabet[i] ?? "바"}. {r}
          </Para>
        ))}
      </Section>
      <Section title="3. 이행조건">
        {decision.conditions.length ? (
          decision.conditions.map((r, i) => (
            <Para sub key={i}>
              {alphabet[i] ?? "바"}. {r}
            </Para>
          ))
        ) : (
          <Para sub>
            별도 부가조건 없음. 유예시간 경과 후 아래의 첫 행동을 이행하여
            주시기 바랍니다.
          </Para>
        )}
      </Section>
      <View wrap={false}>
        <Section title="4. 향후 이행 권고">
          <Para sub>{decision.firstAction}</Para>
          <Para sub>
            본 결정은 실제 외부기관의 의무나 마감기한을 변경하지 않습니다. 끝.
          </Para>
        </Section>
        <Sender />
      </View>
    </>
  );
}

function NoticeBody({
  record,
  document,
  decision,
}: {
  record: CaseRecord;
  document: DocumentRecord;
  decision: Decision;
}) {
  const approval = document.code === "F-07";
  return (
    <>
      <View style={s.meta}>
        <Text style={s.label}>수 신</Text>
        <Text style={s.metaValue}>{record.applicantAlias} 귀하</Text>
      </View>
      <View style={s.subject}>
        <Text style={s.label}>제 목</Text>
        <Text style={s.subjectValue}>
          {approval
            ? "일상업무 유예승인 결정통지"
            : "일상업무 유예신청에 대한 심사 결과 통지"}
        </Text>
      </View>
      <Para>
        1. 귀하께서 제출하신 일상업무 유예신청에 대하여 「국립핑계관리청
        사유심사 운영규정」에 따라 다음과 같이 심사 결과를 통지합니다.
      </Para>
      <Section title="2. 신청사항">
        <Table
          rows={[
            ["접수번호", record.receiptNumber],
            ["유예대상", record.taskDescription],
            [
              "신청사항",
              `${labels.minutes[record.requestedMinutes]} 유예 / 마감기한: ${labels.deadline[record.deadlineCategory]}`,
            ],
            ["처분결과", labels.outcome[decision.outcome]],
          ]}
        />
        <SubmittedDetails record={record} />
      </Section>
      <Section title="3. 심사 결과 및 판단이유">
        {decision.rationale.map((reason, i) => (
          <Para key={i} sub>{`${alphabet[i] ?? "바"}. ${reason}`}</Para>
        ))}
      </Section>
      {approval && (
        <Section title="4. 승인 범위 및 조건">
          <Table
            rows={[
              ["승인번호", document.number],
              [
                "인정범위",
                decision.approvedScope ??
                  `신청한 개인적 업무의 착수 준비시간 ${labels.minutes[record.requestedMinutes]}`,
              ],
              ["이행시점", "본인이 유예시간 경과를 확인한 직후"],
              [
                "부가조건",
                decision.conditions.join("\n") || "별도 부가조건 없음",
              ],
            ]}
          />
          <Para sub>
            실제 제출기한이나 외부기관의 의무는 변경되지 않습니다.
          </Para>
        </Section>
      )}
      {!approval && decision.conditions.length > 0 && (
        <Section title="이행 조건">
          {decision.conditions.map((c, i) => (
            <Para sub key={i}>
              {alphabet[i] ?? "바"}. {c}
            </Para>
          ))}
        </Section>
      )}
      <View wrap={false}>
        <Section title={`${approval ? "5" : "4"}. 향후 이행 권고`}>
          <Para sub>가. {decision.firstAction}</Para>
          <Para sub>
            나.{" "}
            {decision.outcome === "rejected"
              ? "본 처분에 이의가 있는 경우 전자민원포털에서 새로운 소명과 함께 1회 이의신청을 할 수 있습니다."
              : "유예 종료 후 위 권고사항을 이행하여 주시기 바랍니다."}{" "}
            끝.
          </Para>
        </Section>
        <Sender />
      </View>
    </>
  );
}

function InternalBody({
  record,
  decision,
  document,
}: {
  record: CaseRecord;
  decision: Decision;
  document: DocumentRecord;
}) {
  const draft = document.code === "F-05";
  return (
    <>
      <View style={s.draftMeta}>
        <Text>내부기록 열람용 · {document.code}</Text>
        <Text>전자결재 시뮬레이션</Text>
      </View>
      <Approval date={decision.decidedAtISO} />
      <Text style={s.title}>
        {draft ? "일상업무 유예처분 내부결재서" : "사유타당성 심사조서"}
      </Text>
      <Table
        rows={[
          ["사건번호", record.receiptNumber],
          [
            "기안부서",
            draft
              ? "일상유예처분국 유예결정과"
              : "생활사유심사국 제1사유심사과",
          ],
          ["신청인", record.applicantAlias],
          ["처분안", labels.outcome[decision.outcome]],
        ]}
      />
      <Section title={draft ? "1. 기안 목적" : "1. 검토 목적"}>
        <Para>
          {draft
            ? "위 사건의 사유 타당성 검토 결과를 보고하고, 처분안을 결재받고자 함."
            : "신청 사유의 구체성과 유예 적정성을 검토한 결과를 보고함."}
        </Para>
      </Section>
      <Section title="2. 주요 검토사항">
        <Table
          rows={decision.checks
            .filter(
              (c) =>
                !decision.analysis ||
                (c.label !== "종합 의견" &&
                  (c.label !== "업무 진행 상태" ||
                    decision.analysis.facts.some((f) =>
                      [
                        "preparation_complete",
                        "in_progress",
                        "nearly_complete",
                        "remaining_work",
                        "not_started",
                        "completed",
                      ].includes(f.code),
                    )) &&
                  (c.label !== "복귀 가능성" ||
                    Boolean(decision.analysis.plan))),
            )
            .map((c) => [c.label, c.finding])}
        />
      </Section>
      <Section title="3. 처분안 및 심사의견">
        {(draft ? decision.rationale.slice(-1) : decision.rationale).map(
          (reason, i) => (
            <Para key={i} sub>
              {alphabet[i]}. {reason}
            </Para>
          ),
        )}
      </Section>
      <Section title="4. 조치사항">
        <Para>
          처리결과 통지서를 발급하고 다음을 권고할 것: {decision.firstAction}
        </Para>
      </Section>
      <Para>붙임 1. 일상업무 유예신청서 1부. 끝.</Para>
    </>
  );
}

export function OfficialDocument({
  record,
  document,
}: {
  record: CaseRecord;
  document: DocumentRecord;
}) {
  const decision = document.decision ?? record.decision;
  if (!decision && !["F-01", "F-02"].includes(document.code))
    throw new Error("심사 결정이 없어 문서를 만들 수 없습니다.");
  const internal = document.code === "F-04" || document.code === "F-05";
  let body: React.ReactNode;
  if (document.code === "F-01" || document.code === "F-08")
    body = <ApplicationBody record={record} document={document} />;
  else if (document.code === "F-02") body = <ReceiptBody record={record} />;
  else if (document.code === "F-03")
    body = <SupplementBody record={record} decision={decision!} />;
  else if (document.code === "F-09")
    body = <AppealNoticeBody record={record} decision={decision!} />;
  else if (document.code === "F-07")
    body = (
      <ApprovalNoticeBody
        record={record}
        document={document}
        decision={decision!}
      />
    );
  else if (internal)
    body = (
      <InternalBody record={record} document={document} decision={decision!} />
    );
  else
    body = (
      <NoticeBody record={record} document={document} decision={decision!} />
    );
  const department =
    document.code === "F-09" || document.code === "F-08"
      ? "재심사조정실"
      : document.code === "F-01" || document.code === "F-02"
        ? "전자민원접수과"
        : document.code === "F-05"
          ? "유예결정과"
          : "제1사유심사과";
  return (
    <Document
      title={`${formNames[document.code]} · ${record.receiptNumber}`}
      author="국립핑계관리청 (가상기관)"
      subject="가상기관 창작문서"
      creator="국립핑계관리청 전자문서관리실"
      language="ko-KR"
      creationDate={new Date(document.issuedAtISO)}
      modificationDate={new Date(document.issuedAtISO)}
    >
      <Page size="A4" style={s.page}>
        <View
          fixed
          style={{
            position: "absolute",
            top: mm(105),
            left: mm(50),
            opacity: internal
              ? 0.55
              : ["F-01", "F-02", "F-08"].includes(document.code)
                ? 0.4
                : 1,
          }}
        >
          <Emblem size={t.watermarkSize} watermark />
        </View>
        <Text
          fixed
          style={{
            position: "absolute",
            top: mm(9),
            left: t.margin.horizontal,
            fontSize: 8,
            color: t.gray,
          }}
          render={({ pageNumber }) =>
            pageNumber > 1
              ? `국립핑계관리청 · ${formNames[document.code]} (계속)`
              : ""
          }
        />
        <Header />
        {body}
        <View fixed style={s.footer}>
          <Text style={{ marginBottom: 4 }}>
            시행 {document.number} ({formatDate(document.issuedAtISO)})
          </Text>
          <Text style={{ marginBottom: 4 }}>
            접수 {record.receiptNumber} / 담당 {department}
          </Text>
          <View style={s.footerLine}>
            <Text>
              서식 {document.code} · {document.templateVersion}
            </Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}   가상기관 창작문서`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
