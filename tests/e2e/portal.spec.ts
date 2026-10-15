import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
const output = path.resolve("output/browser");
test.beforeAll(async () => {
  await fs.mkdir(output, { recursive: true });
});
async function submit(
  page: Page,
  options: {
    task?: string;
    reason?: string;
    minutes?: string;
    deadline?: string;
    mode?: string;
    evidence?: string;
  } = {},
) {
  await page.goto("./#/apply");
  await page
    .getByLabel("해야 할 일필수", { exact: true })
    .fill(options.task ?? "오늘 해야 할 과제를 내일로 미루고 싶다.");
  await page
    .getByLabel("신청 사유 상세필수", { exact: true })
    .fill(options.reason ?? "시작할 의욕이 없다.");
  await page
    .getByLabel("희망 유예시간필수", { exact: true })
    .selectOption(options.minutes ?? "1440");
  if (options.deadline)
    await page
      .getByLabel("실제 마감기한필수", { exact: true })
      .selectOption(options.deadline);
  if (options.mode === "lenient")
    await page.getByRole("radio", { name: /관대한 심사/ }).check();
  if (options.evidence)
    await page.getByLabel("부연 소명", { exact: true }).fill(options.evidence);
  await page.getByRole("button", { name: "내용 확인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "민원 접수", exact: true }),
  ).toBeDisabled();
  const required = page.getByRole("checkbox", { name: /^\[필수\]/ });
  for (let i = 0; i < 3; i++) await required.nth(i).check();
  await page.getByRole("button", { name: "민원 접수", exact: true }).dblclick();
  await expect(page).toHaveURL(/#\/receipt\//);
  const receipt = (await page.locator("main").innerText()).match(
    /PM-\d{8}-[A-Z0-9]{8}/,
  )![0];
  await page.getByRole("button", { name: "심사 시작", exact: true }).click();
  await expect(page).toHaveURL(/#\/result\//, { timeout: 30000 });
  return receipt;
}
async function waitPdf(page: Page) {
  await expect(
    page.getByRole("img", {
      name: /처리결과 통지서 1페이지|사유 보완요구서 1페이지|심사결과 통지서 1페이지/,
    }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("button", { name: "PDF 내려받기", exact: true }),
  ).toBeEnabled({ timeout: 45000 });
}
test("strict rejection, PDF, persistence, appeal, ZIP and JSON restoration", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const receipt = await submit(page);
  await expect(
    page.locator("main").getByText("불승인", { exact: true }),
  ).toBeVisible();
  await waitPdf(page);
  const resultUrl = page.url();
  await page.screenshot({
    path: path.join(output, "result-desktop.png"),
    fullPage: true,
  });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 내려받기", exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs(path.join(output, "browser-F06.pdf"));
  expect(
    (await fs.readFile(path.join(output, "browser-F06.pdf")))
      .subarray(0, 4)
      .toString(),
  ).toBe("%PDF");
  const originalRationale = await page.locator("main").innerText();
  await page.reload();
  await expect(page.locator("main")).toContainText(receipt);
  await expect(page.locator("main")).toContainText("익일의 자발적 착수");
  await page.getByRole("link", { name: "이의신청", exact: true }).click();
  await page
    .getByLabel("새롭게 제출하는 사실 및 근거 필수")
    .fill(
      "과제의 자료 조사를 이미 완료했습니다. 새롭게 확인한 일정에 따라 10분 동안 개요를 작성하고, 이후 첫 문단에 즉시 착수하는 구체적인 이행계획을 제출합니다.",
    );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "이의신청 접수", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/result\//);
  await expect(
    page.locator("main").getByText("조건부 승인", { exact: true }),
  ).toBeVisible();
  await waitPdf(page);
  await expect(
    page.getByRole("link", { name: "이의신청", exact: true }),
  ).toHaveCount(0);
  const zipEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "서류 일괄 ZIP 발급", exact: true })
    .click();
  const zipDownload = await zipEvent;
  await zipDownload.saveAs(path.join(output, "case-documents.zip"));
  const zip = await JSZip.loadAsync(
    await fs.readFile(path.join(output, "case-documents.zip")),
  );
  expect(Object.keys(zip.files)).toHaveLength(8);
  expect(Object.keys(zip.files).some((name) => name.startsWith("F-09"))).toBe(
    true,
  );
  expect(Object.keys(zip.files).some((name) => name.startsWith("F-03"))).toBe(
    false,
  );
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "나의 민원", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const backupEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "기록 내보내기", exact: true })
    .click();
  const backup = await backupEvent;
  const backupPath = path.join(output, "browser-backup.json");
  await backup.saveAs(backupPath);
  const data = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(data.cases).toHaveLength(1);
  expect(
    data.cases[0].documents.find((d: { code: string }) => d.code === "F-06")
      .decision.outcome,
  ).toBe("rejected");
  expect(data.cases[0].receiptNumber).toBe(receipt);
  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await secondPage.goto("./#/my-cases");
  await secondPage.getByLabel("JSON 백업 파일").setInputFiles(backupPath);
  await expect(secondPage.getByRole("status")).toContainText(
    "1건을 가져왔습니다.",
  );
  await secondPage.getByRole("link", { name: /상세보기/ }).click();
  await expect(secondPage.locator("main")).toContainText(receipt);
  await expect(
    secondPage.locator("main").getByText("조건부 승인", { exact: true }),
  ).toBeVisible();
  await second.close();
  expect(errors).toEqual([]);
  expect(originalRationale).toContain("불승인");
  expect(resultUrl).toContain("#/result/");
});
test("short, concrete, deadline-free request is approved", async ({ page }) => {
  await submit(page, {
    minutes: "10",
    deadline: "none",
    reason:
      "오전에 정리 작업을 계속 진행하여 잠시 쉬고자 합니다. 10분간 휴식한 뒤 책상 위 서류를 분류하고 남은 정리 작업을 마무리하겠습니다.",
  });
  await expect(
    page.locator("main").getByText("승인", { exact: true }),
  ).toBeVisible();
  await waitPdf(page);
  await page.getByRole("link", { name: /관련서류/ }).click();
  await expect(page.getByRole("button", { name: /F-07/ })).toBeVisible();
});
test("supplement once then final disposition, preserving the request", async ({
  page,
}) => {
  await submit(page, { deadline: "unknown" });
  await expect(
    page.locator("main").getByText("보완요구", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /보완자료 제출/ }).click();
  await page
    .getByLabel("추가 소명 필수")
    .fill(
      "확인 결과 마감은 내일이며, 지금은 잠시 쉬고 난 뒤 자료 정리부터 진행하겠습니다. 유예시간은 업무에 복귀하기 위한 준비시간으로 요청합니다.",
    );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "보완자료 접수", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/result\//);
  await expect(
    page.locator("main").getByText("보완요구", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /관련서류/ }).click();
  await expect(page.getByRole("button", { name: /F-03/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /F-06/ })).toBeVisible();
});
test("long Korean content paginates and literal markup cannot execute", async ({
  page,
}) => {
  let dialog = false;
  page.on("dialog", async (d) => {
    dialog = true;
    await d.dismiss();
  });
  await submit(page, {
    task: "<img src=x onerror=alert(1)> 과제 작성하기",
    reason:
      "시작할 의욕이 없다. 한글 장문과 漢字, English 123 및 특수문자 (가) / % 의 조판을 검토합니다.\n"
        .repeat(15)
        .slice(0, 1000),
    evidence: "사유를 충분히 소명하며 추가 자료와 수행계획을 안내합니다.\n"
      .repeat(35)
      .slice(0, 1500),
  });
  await waitPdf(page);
  await expect(
    page.getByRole("button", { name: "다음 PDF 페이지", exact: true }),
  ).toBeEnabled();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 내려받기", exact: true }).click();
  await (await event).saveAs(path.join(output, "browser-F06-long.pdf"));
  await page
    .getByRole("button", { name: "다음 PDF 페이지", exact: true })
    .click();
  await page.screenshot({
    path: path.join(output, "document-long-page2.png"),
    fullPage: true,
  });
  expect(dialog).toBe(false);
  await expect(page.locator("main img[onerror]")).toHaveCount(0);
});
test("mobile layout, keyboard form, draft and local-only requests", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith(new URL(baseURL!).origin + "/") &&
      !r.url().startsWith("blob:") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("./");
  await page.screenshot({
    path: path.join(output, "home-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "민원서비스", exact: true })
    .click();
  await page.getByRole("link", { name: "신청하기", exact: true }).click();
  await page
    .getByLabel("해야 할 일필수", { exact: true })
    .fill("자동 저장을 확인하기 위한 신청 내용");
  await page.getByRole("button", { name: "임시저장", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("해야 할 일필수", { exact: true })).toHaveValue(
    "자동 저장을 확인하기 위한 신청 내용",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(output, "apply-mobile.png"),
    fullPage: true,
  });
  expect(external).toEqual([]);
});

test("sentence-specific review, evidence and mobile result stay entirely local", async ({
  page,
  baseURL,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      /^https?:/u.test(request.url()) &&
      new URL(request.url()).origin !== new URL(baseURL!).origin
    )
      requests.push(request.url());
  });
  await submit(page, {
    task: "오늘 마감인 보고서 본문 작성하기",
    reason: "자료는 다 찾았고 본문만 남았다. 게임 좀 하다가 내일 쓰고 싶다.",
  });
  await expect(
    page.locator("main").getByText("불승인", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("여가 활동 우선 희망");
  await expect(page.locator("main")).toContainText("남은 대상업무");
  await expect(page.locator("main")).toContainText("남았다고 기재한 본문");
  await page.getByText("신청내용에서 검토한 사항", { exact: true }).click();
  await expect(
    page.getByRole("definition").filter({ hasText: /남은 작업 식별/ }),
  ).toBeVisible();
  await waitPdf(page);
  await page.screenshot({
    path: path.join(output, "semantic-result-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(output, "semantic-result-mobile.png"),
    fullPage: true,
  });
  expect(requests).toEqual([]);
});

test("denied fatigue is not repeated as a reason for approval", async ({
  page,
}) => {
  await submit(page, {
    minutes: "10",
    deadline: "none",
    reason: "피곤하지 않다. 게임을 더 하고 싶다.",
  });
  await expect(
    page.locator("main").getByText("조건부 승인", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("여가 활동 우선 희망");
  await expect(page.locator("main")).not.toContainText("피로·기력 저하 정황");
});

test("conflicting deadline gets a specific supplement and a corrected final decision", async ({
  page,
}) => {
  await submit(page, {
    minutes: "10",
    deadline: "none",
    reason: "오늘 마감이다. 피곤하다. 10분 뒤 본문을 작성하겠습니다.",
  });
  await expect(
    page.locator("main").getByText("보완요구", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("일치하지 않음");
  await page.getByRole("link", { name: /보완자료 제출/ }).click();
  await page
    .getByLabel("추가 소명 필수")
    .fill(
      "확인 결과 마감은 내일입니다. 10분 뒤 본문의 첫 문장을 작성하겠습니다.",
    );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "보완자료 접수", exact: true })
    .click();
  await expect(
    page.locator("main").getByText("조건부 승인", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("보완 소명");
  await waitPdf(page);
  await page.reload();
  await expect(page.locator("main")).toContainText("내일 이후");
});
test("deletion requires confirmation and malformed imports keep records", async ({
  page,
}) => {
  await submit(page);
  await page.goto("./#/my-cases");
  await page.getByRole("button", { name: /PM-.*삭제/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("JSON 백업 파일").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":900}'),
  });
  await expect(page.getByRole("alert")).toContainText(
    "지원하지 않는 백업 형식",
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: /PM-.*삭제/ }).click();
  await page.getByRole("button", { name: "기록 삭제", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "아직 접수한 민원이 없습니다." }),
  ).toBeVisible();
});
test("blocked IndexedDB clearly warns and still allows a receipt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException("Test storage denied", "SecurityError");
    };
  });
  await submit(page);
  await expect(page.locator("main")).toContainText("현재 탭에만 임시 보관");
  await expect(
    page.getByRole("link", { name: "기록 백업하기", exact: true }),
  ).toBeVisible();
});
test("font failure issues no empty PDF and retry recovers", async ({
  page,
}) => {
  await page.route("**/fonts/*.ttf", (route) => route.abort());
  await submit(page);
  await expect(page.getByRole("alert")).toContainText(
    "한글 글꼴을 불러오지 못했습니다",
  );
  await expect(
    page.getByRole("img", { name: /처리결과 통지서 1페이지/ }),
  ).toBeHidden();
  await page.unroute("**/fonts/*.ttf");
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await waitPdf(page);
});
test("already loaded core workflow runs without network access", async ({
  page,
  context,
}) => {
  await page.goto("./#/apply");
  await page
    .getByLabel("해야 할 일필수", { exact: true })
    .fill("네트워크 없이 접수할 과제 작성하기");
  await page
    .getByLabel("신청 사유 상세필수", { exact: true })
    .fill("시작할 의욕이 없다.");
  await page
    .getByLabel("희망 유예시간필수", { exact: true })
    .selectOption("1440");
  await context.setOffline(true);
  await page.getByRole("button", { name: "내용 확인", exact: true }).click();
  const required = page.getByRole("checkbox", { name: /^\[필수\]/ });
  for (let i = 0; i < 3; i++) await required.nth(i).check();
  await page.getByRole("button", { name: "민원 접수", exact: true }).click();
  await expect(page).toHaveURL(/#\/receipt\//);
  await page.getByRole("button", { name: "심사 시작", exact: true }).click();
  await expect(page).toHaveURL(/#\/result\//);
  await expect(
    page.locator("main").getByText("불승인", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("keyboard-only application, consent and receipt controls", async ({
  page,
}) => {
  await page.goto("./#/apply");
  await page.getByLabel("신청인 표시명", { exact: true }).focus();
  await page.keyboard.type("Keyboard Reviewer");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("업무 종류필수", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.type("Complete the assignment tomorrow.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("신청 사유 상세필수", { exact: true }),
  ).toBeFocused();
  await page.keyboard.type(
    "I need a short break before starting this assignment.",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "내용 확인", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const required = page.getByRole("checkbox", { name: /^\[필수\]/ });
  await required.nth(0).focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
  }
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "민원 접수", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/receipt\//);
  await expect(
    page.getByRole("heading", {
      name: "귀하의 사유가 행정적으로 존재하게 되었습니다.",
    }),
  ).toBeVisible();
});
