import { courseRequiredFields, expenseNonAmountFields, expenseTravelFields } from "@/config/workflow";
import type { SheetRow, WorkbenchItem } from "@/lib/types";

export function cleanHeader(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cell(row: SheetRow, field: string): string {
  return String(row[cleanHeader(field)] || "").trim();
}

function pick(row: SheetRow, fields: string[]): string {
  for (const field of fields) {
    const found = cell(row, field);
    if (found) return found;
  }
  return "";
}

function moneyNumber(input: unknown): number {
  const text = String(input || "").replace(/[,，\s$元]/g, "");
  if (!text) return 0;
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("zh-TW")}`;
}

export function analyzeCourse(row: SheetRow): WorkbenchItem {
  const missing = courseRequiredFields
    .filter(([field]) => !cell(row, field))
    .map(([, label]) => label);
  const speaker = cell(row, "講師安排");
  const classTime = cell(row, "授課日期時段");
  const planner = cell(row, "指派規劃師");
  const notes = cell(row, "佩欣建檔備註");
  const topic = cell(row, "期待的課程主題?");
  const unit = cell(row, "您的單位全名 (含部門、中心、組別)");
  const requestedTime = cell(row, "期待的授課日期與時段 (請提供指定日期/時間或 2-3 個理想時段)");

  const tags: WorkbenchItem["tags"] = [];
  if (missing.length) tags.push({ type: "danger", label: `缺 ${missing.length} 欄` });
  if (!speaker) tags.push({ type: "warning", label: "待派講師" });
  if (speaker && !classTime) tags.push({ type: "warning", label: "待定授課時段" });
  if (classTime && !notes) tags.push({ type: "info", label: "待確認 Calendar/建檔" });
  if (!planner) tags.push({ type: "warning", label: "未指派規劃師" });
  if (!tags.length) tags.push({ type: "ok", label: "可追後續資料" });

  const nextSteps: string[] = [];
  if (missing.length) nextSteps.push(`請補：${missing.join("、")}`);
  if (!speaker) nextSteps.push("轉給 Ivy / 素菁確認講師安排");
  if (speaker && !classTime) nextSteps.push("確認正式授課日期時段");
  if (classTime && !notes) nextSteps.push("確認是否已建立 Calendar 與內部備註");
  if (!planner) nextSteps.push("補上指派規劃師");
  if (!nextSteps.length) nextSteps.push("進入課綱、講師資料與簡報追蹤");

  return {
    type: "course",
    source: `課務 R${row.__rowNumber}`,
    title: unit || "(未填單位)",
    subtitle: topic || "(未填主題)",
    severity: missing.length ? "danger" : !speaker || !classTime || !planner ? "warning" : "ok",
    tags,
    missing,
    nextSteps,
    searchText: [unit, topic, speaker, planner, requestedTime].join(" "),
    draft: buildCourseDraft(row, missing, nextSteps),
  };
}

function buildCourseDraft(row: SheetRow, missing: string[], nextSteps: string[]): string {
  const unit = cell(row, "您的單位全名 (含部門、中心、組別)") || "未填單位";
  const topic = cell(row, "期待的課程主題?") || "未填主題";
  const date =
    pick(row, ["授課日期時段", "期待的授課日期與時段 (請提供指定日期/時間或 2-3 個理想時段)"]) ||
    "待確認";
  const place = cell(row, "預計舉辦課程的地點?(縣市+區域，或有詳細地址也可唷)") || "待確認";
  const hours = cell(row, "課程總時數") || "待確認";
  const people = cell(row, "預計參與人數") || "待確認";
  const fee =
    cell(row, "鐘點費金額(每小時)，或出席費金額") ||
    cell(row, "貴單位是否同意支付講師鐘點費? ( 費用細節會另外致電詳談 )") ||
    "待確認";

  return [
    "【課務邀約整理】",
    `單位：${unit}`,
    `主題：${topic}`,
    `日期：${date}`,
    `地點：${place}`,
    `時數 / 人數：${hours} / ${people}`,
    `費用：${fee}`,
    missing.length ? `缺資料：${missing.join("、")}` : "缺資料：目前未發現必要欄位缺漏",
    `建議下一步：${nextSteps[0] || "請確認後續追蹤"}`,
  ].join("\n");
}

export function analyzeExpense(row: SheetRow, headers: string[]): WorkbenchItem {
  const missing: string[] = [];
  [
    ["專案類別", "專案"],
    ["訪視/課程/諮詢日期", "日期"],
    ["請款人", "請款人"],
    ["單據用途", "用途"],
    ["核銷類別", "類別"],
    ["單據費用總計", "總計"],
  ].forEach(([field, label]) => {
    if (!cell(row, field)) missing.push(label);
  });

  const amountColumns = headers.filter((header) => !expenseNonAmountFields.includes(header));
  const detailSum = amountColumns.reduce((sum, column) => sum + moneyNumber(cell(row, column)), 0);
  const total = moneyNumber(cell(row, "單據費用總計"));
  const diff = detailSum - total;
  const hasTravel = expenseTravelFields.some((column) => moneyNumber(cell(row, column)) > 0);
  const travelNeedsRoute = hasTravel && !cell(row, "行程起訖點說明");
  const needsReceiptCount = detailSum > 0 && !cell(row, "單據數量");
  const needsReceiptDate = detailSum > 0 && !cell(row, "單據日期");

  const tags: WorkbenchItem["tags"] = [];
  if (missing.length) tags.push({ type: "danger", label: `缺 ${missing.length} 欄` });
  if (Math.abs(diff) >= 1) tags.push({ type: "danger", label: "金額不一致" });
  if (travelNeedsRoute) tags.push({ type: "warning", label: "缺行程起訖" });
  if (needsReceiptCount) tags.push({ type: "warning", label: "缺單據數量" });
  if (needsReceiptDate) tags.push({ type: "warning", label: "缺單據日期" });
  if (!tags.length) tags.push({ type: "ok", label: "金額可初步通過" });

  const nextSteps: string[] = [];
  if (missing.length) nextSteps.push(`請補：${missing.join("、")}`);
  if (Math.abs(diff) >= 1) nextSteps.push(`明細加總 ${formatMoney(detailSum)}，與總計差 ${formatMoney(diff)}`);
  if (travelNeedsRoute) nextSteps.push("交通費需補行程起訖點");
  if (needsReceiptCount) nextSteps.push("補單據數量，方便核對紙本或照片");
  if (needsReceiptDate) nextSteps.push("補單據日期");
  if (!nextSteps.length) nextSteps.push("可進入人工核對單據影像與專案規則");

  const claimant = cell(row, "請款人") || "(未填請款人)";
  const project = cell(row, "專案類別") || "(未填專案)";
  const purpose = cell(row, "單據用途") || "(未填用途)";

  return {
    type: "expense",
    source: `核銷 R${row.__rowNumber}`,
    title: claimant,
    subtitle: `${project} · ${purpose}`,
    severity: missing.length || Math.abs(diff) >= 1 ? "danger" : travelNeedsRoute || needsReceiptCount || needsReceiptDate ? "warning" : "ok",
    tags,
    missing,
    detailSum,
    total,
    diff,
    nextSteps,
    searchText: [claimant, project, purpose, cell(row, "核銷類別")].join(" "),
    draft: buildExpenseDraft(row, detailSum, total, diff, nextSteps),
  };
}

function buildExpenseDraft(row: SheetRow, detailSum: number, total: number, diff: number, nextSteps: string[]): string {
  const claimant = cell(row, "請款人") || "您好";
  const project = cell(row, "專案類別") || "未填專案";
  const purpose = cell(row, "單據用途") || "未填用途";
  const date = cell(row, "訪視/課程/諮詢日期") || "未填日期";
  const issue = nextSteps[0] || "目前金額可初步通過，仍需人工核對單據。";

  return [
    `${claimant} 您好，`,
    `這筆核銷資料我先整理到工作台了：${project} / ${purpose} / ${date}`,
    `表單總計：${formatMoney(total)}；明細加總：${formatMoney(detailSum)}。`,
    Math.abs(diff) >= 1 ? `目前差額：${formatMoney(diff)}，想請您協助確認金額或分類。` : "金額目前初步一致。",
    `待確認事項：${issue}`,
  ].join("\n");
}
