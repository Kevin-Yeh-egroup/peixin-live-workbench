"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardPayload, Severity, WorkbenchItem } from "@/lib/types";

type ViewName = "dashboard" | "course" | "expense" | "drafts" | "dictionary";
type CourseFilter = "all" | "missing" | "assignment" | "calendar";
type ExpenseFilter = "all" | "mismatch" | "missing" | "travel";

function escapeForDownload(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function formatMoney(amount?: number): string {
  return `$${Math.round(Number(amount) || 0).toLocaleString("zh-TW")}`;
}

function severityRank(severity: Severity): number {
  if (severity === "danger") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function ratio(valueCount: number, total: number): number {
  if (!total) return 0;
  return Math.max(7, Math.min(100, Math.round((valueCount / total) * 100)));
}

function tagClass(type: string): string {
  return `tag ${type}`;
}

function Tags({ item }: { item: Pick<WorkbenchItem, "tags"> }) {
  return (
    <div className="tag-row">
      {item.tags.map((tag) => (
        <span className={tagClass(tag.type)} key={`${tag.type}-${tag.label}`}>
          {tag.label}
        </span>
      ))}
    </div>
  );
}

function FieldChip({ header }: { header: string }) {
  const sensitiveWords = ["姓名", "電話", "Email", "電子郵件", "請款人", "經手人", "地址", "抬頭", "統編"];
  const statusWords = ["講師安排", "助教安排", "授課日期時段", "建檔備註", "指派規劃師", "總計", "單據數量", "專案類別"];
  const className = [
    "field-chip",
    sensitiveWords.some((word) => header.includes(word)) ? "is-sensitive" : "",
    statusWords.some((word) => header.includes(word)) ? "is-status" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={className}>{header}</span>;
}

export function Workbench({ logoutAction }: { logoutAction: () => Promise<void> }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewName>("dashboard");
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>("all");
  const [search, setSearch] = useState("");
  const [showOkDrafts, setShowOkDrafts] = useState(false);
  const [toast, setToast] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "讀取失敗");
      }
      const payload = (await response.json()) as DashboardPayload;
      setData(payload);
      showToast("已讀取最新資料");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return { course: [], expense: [] };
    const query = search.trim().toLowerCase();
    const course = data.course.rows.filter((item) => !query || `${item.searchText} ${item.draft}`.toLowerCase().includes(query));
    const expense = data.expense.rows.filter((item) => !query || `${item.searchText} ${item.draft}`.toLowerCase().includes(query));
    return { course, expense };
  }, [data, search]);

  const courseRows = useMemo(() => {
    if (courseFilter === "missing") return filtered.course.filter((item) => item.missing.length);
    if (courseFilter === "assignment") return filtered.course.filter((item) => item.tags.some((tag) => tag.label.includes("待派")));
    if (courseFilter === "calendar") {
      return filtered.course.filter((item) => item.tags.some((tag) => tag.label.includes("Calendar") || tag.label.includes("授課")));
    }
    return filtered.course;
  }, [courseFilter, filtered.course]);

  const expenseRows = useMemo(() => {
    if (expenseFilter === "mismatch") return filtered.expense.filter((item) => Math.abs(item.diff || 0) >= 1);
    if (expenseFilter === "missing") {
      return filtered.expense.filter((item) => item.missing.length || item.tags.some((tag) => tag.label.includes("缺單據")));
    }
    if (expenseFilter === "travel") return filtered.expense.filter((item) => item.tags.some((tag) => tag.label.includes("行程")));
    return filtered.expense;
  }, [expenseFilter, filtered.expense]);

  const allItems = [...filtered.course, ...filtered.expense];
  const riskItems = allItems.filter((item) => item.severity !== "ok");
  const priorityItems = riskItems.slice().sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 10);
  const draftItems = allItems.filter((item) => showOkDrafts || item.severity !== "ok");

  async function copyDraft(text: string) {
    await navigator.clipboard.writeText(text);
    showToast("已複製草稿");
  }

  function exportReport() {
    if (!data) return;
    const lines = [
      "# 佩欣每日工作台",
      "",
      `產生時間：${data.generatedAt}`,
      "資料來源：Vercel server-side 即時讀取 Google Sheet",
      "",
      "## 今日摘要",
      "",
      `- 課務筆數：${filtered.course.length}`,
      `- 課務缺資料：${filtered.course.filter((item) => item.missing.length).length}`,
      `- 核銷需處理：${filtered.expense.filter((item) => item.severity !== "ok").length}`,
      `- 優先處理：${riskItems.length}`,
      "",
      "## 優先處理",
      "",
      ...riskItems.flatMap((item) => [
        `### ${item.source} ${item.title}`,
        "",
        `- 狀態：${item.tags.map((tag) => tag.label).join("、")}`,
        `- 下一步：${item.nextSteps.join("；")}`,
        "",
        "```text",
        escapeForDownload(item.draft),
        "```",
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `peixin-live-workbench-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("已下載 Markdown 日報");
  }

  const titles: Record<ViewName, string> = {
    dashboard: "今日總覽",
    course: "課務工作台",
    expense: "核銷檢查器",
    drafts: "訊息草稿",
    dictionary: "欄位地圖",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主要導覽">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            P
          </div>
          <div>
            <h1>佩欣工作台</h1>
            <p>Vercel 即時讀取版</p>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="工作台分頁">
          {[
            ["dashboard", "▦", "今日總覽"],
            ["course", "□", "課務"],
            ["expense", "∑", "核銷"],
            ["drafts", "✎", "草稿"],
            ["dictionary", "#", "欄位地圖"],
          ].map(([name, icon, label]) => (
            <button
              className={`nav-tab ${view === name ? "is-active" : ""}`}
              key={name}
              type="button"
              onClick={() => setView(name as ViewName)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <section className="source-panel">
          <h2>資料來源</h2>
          <p>Server-side 只讀取 Google Sheet；程式碼公開，資料和金鑰放 Vercel env vars。</p>
          <div className="sheet-source-list">
            {data?.sources.map((source) => (
              <article className="sheet-source-card" key={source.kind}>
                <header>
                  <div>
                    <strong>{source.label}表單</strong>
                    <small>
                      {source.sheetName} · {source.rows.toLocaleString("zh-TW")} 列 / {source.columns} 欄
                    </small>
                  </div>
                  <span className="tag info">{source.label}</span>
                </header>
                <small>{source.title}</small>
                <small>本次載入最新 {source.loadedRows.toLocaleString("zh-TW")} 筆</small>
                <div className="source-links">
                  <a className="source-link" href={source.url} target="_blank" rel="noreferrer noopener">
                    開啟
                  </a>
                  <a className="source-link" href={source.csvUrl} target="_blank" rel="noreferrer noopener">
                    CSV
                  </a>
                </div>
              </article>
            )) || <div className="empty-state">登入後讀取資料來源。</div>}
          </div>
          <button className="primary-button" type="button" onClick={loadDashboard} disabled={loading}>
            重新讀取最新資料
          </button>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit" style={{ width: "100%", marginTop: 8 }}>
              登出
            </button>
          </form>
        </section>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Production-ready · protected</p>
            <h2>{titles[view]}</h2>
          </div>
          <div className="topbar-controls">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={search} type="search" placeholder="搜尋單位、請款人、專案、草稿" onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="status-pill">{data ? `已讀取 ${data.generatedAt}` : loading ? "讀取中" : "尚未讀取"}</div>
          </div>
        </header>

        {loading ? (
          <section className="loading-state">
            <div className="loader" aria-hidden="true" />
            <div>
              <strong>正在讀取 Google Sheet</strong>
              <p>透過 Vercel server-side API 讀取，不在瀏覽器暴露 Google 金鑰。</p>
            </div>
          </section>
        ) : null}

        {error ? <section className="work-panel error-text">{error}</section> : null}

        <section className={`view ${view === "dashboard" ? "is-active" : ""}`}>
          <div className="summary-grid">
            {[
              { label: "課務筆數", value: filtered.course.length, tone: "", ratio: filtered.course.length ? 88 : 0 },
              {
                label: "課務缺資料",
                value: filtered.course.filter((item) => item.missing.length).length,
                tone: filtered.course.some((item) => item.missing.length) ? "is-warning" : "",
                ratio: ratio(filtered.course.filter((item) => item.missing.length).length, filtered.course.length),
              },
              {
                label: "待派講師",
                value: filtered.course.filter((item) => item.tags.some((tag) => tag.label.includes("待派"))).length,
                tone: filtered.course.some((item) => item.tags.some((tag) => tag.label.includes("待派"))) ? "is-warning" : "",
                ratio: ratio(filtered.course.filter((item) => item.tags.some((tag) => tag.label.includes("待派"))).length, filtered.course.length),
              },
              {
                label: "核銷需處理",
                value: filtered.expense.filter((item) => item.severity !== "ok").length,
                tone: filtered.expense.some((item) => item.severity !== "ok") ? "is-danger" : "",
                ratio: ratio(filtered.expense.filter((item) => item.severity !== "ok").length, filtered.expense.length),
              },
            ].map((metric) => (
              <article className={`metric-card ${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <div className="meter" aria-hidden="true">
                  <i style={{ width: `${metric.ratio}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="split-layout">
            <section className="work-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Priority queue</p>
                  <h3>今天先處理</h3>
                </div>
                <span className="mini-badge">{priorityItems.length}</span>
              </div>
              <div className="task-list">
                {priorityItems.length ? (
                  priorityItems.map((item) => (
                    <article className={`task-item ${item.severity === "danger" ? "is-danger" : "is-warning"}`} key={`${item.source}-${item.title}`}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {item.source} · {item.nextSteps[0] || item.subtitle}
                        </p>
                      </div>
                      <Tags item={{ tags: item.tags.slice(0, 2) }} />
                    </article>
                  ))
                ) : (
                  <div className="empty-state">目前沒有需要優先處理的項目。</div>
                )}
              </div>
            </section>

            <section className="work-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Safety boundary</p>
                  <h3>資料保護方式</h3>
                </div>
              </div>
              <div className="safety-list">
                <div>
                  <strong>Public URL，不 public 資料</strong>
                  <span>頁面可在 Vercel Production 開，但進入工作台需密碼。</span>
                </div>
                <div>
                  <strong>Server-side read-only</strong>
                  <span>Google service account 和 private key 只存在 Vercel env vars。</span>
                </div>
                <div>
                  <strong>不寫回</strong>
                  <span>API route 只讀取 values.get，不修改原本 Sheet。</span>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className={`view ${view === "course" ? "is-active" : ""}`}>
          <div className="section-head">
            <div>
              <p className="eyebrow">Course intake</p>
              <h3>課務工作台</h3>
            </div>
            <div className="segmented">
              {[
                ["all", "全部"],
                ["missing", "缺資料"],
                ["assignment", "待派課"],
                ["calendar", "待確認"],
              ].map(([name, label]) => (
                <button className={`segment ${courseFilter === name ? "is-active" : ""}`} type="button" key={name} onClick={() => setCourseFilter(name as CourseFilter)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <CourseTable rows={courseRows} onCopy={copyDraft} />
        </section>

        <section className={`view ${view === "expense" ? "is-active" : ""}`}>
          <div className="section-head">
            <div>
              <p className="eyebrow">Expense checker</p>
              <h3>核銷檢查器</h3>
            </div>
            <div className="segmented">
              {[
                ["all", "全部"],
                ["mismatch", "金額異常"],
                ["missing", "缺件"],
                ["travel", "交通待查"],
              ].map(([name, label]) => (
                <button className={`segment ${expenseFilter === name ? "is-active" : ""}`} type="button" key={name} onClick={() => setExpenseFilter(name as ExpenseFilter)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ExpenseTable rows={expenseRows} onCopy={copyDraft} />
        </section>

        <section className={`view ${view === "drafts" ? "is-active" : ""}`}>
          <div className="section-head">
            <div>
              <p className="eyebrow">Draft generator</p>
              <h3>待複製草稿</h3>
            </div>
            <div className="draft-actions">
              <label className="toggle">
                <input checked={showOkDrafts} type="checkbox" onChange={(event) => setShowOkDrafts(event.target.checked)} />
                包含無異常項目
              </label>
              <button className="secondary-button" type="button" onClick={exportReport}>
                下載日報
              </button>
            </div>
          </div>
          <div className="draft-grid">
            {draftItems.length ? (
              draftItems.map((item) => (
                <article className="draft-card" key={`draft-${item.source}-${item.title}`}>
                  <header>
                    <div>
                      <p className="eyebrow">{item.source}</p>
                      <h4>{item.title}</h4>
                    </div>
                    <button className="copy-button" type="button" onClick={() => copyDraft(item.draft)}>
                      複製
                    </button>
                  </header>
                  <Tags item={item} />
                  <pre>{item.draft}</pre>
                </article>
              ))
            ) : (
              <div className="empty-state">目前沒有待處理草稿。勾選右上方可顯示無異常項目。</div>
            )}
          </div>
        </section>

        <section className={`view ${view === "dictionary" ? "is-active" : ""}`}>
          <div className="section-head">
            <div>
              <p className="eyebrow">Field map</p>
              <h3>欄位地圖</h3>
            </div>
          </div>
          <div className="dictionary-grid">
            <section className="work-panel">
              <h4>課程邀約表單</h4>
              <div className="field-cloud">{data?.course.headers.map((header) => <FieldChip header={header} key={header} />)}</div>
            </section>
            <section className="work-panel">
              <h4>報帳表單</h4>
              <div className="field-cloud">{data?.expense.headers.map((header) => <FieldChip header={header} key={header} />)}</div>
            </section>
          </div>
        </section>
      </main>
      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

function CourseTable({ rows, onCopy }: { rows: WorkbenchItem[]; onCopy: (text: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>來源</th>
            <th>單位 / 主題</th>
            <th>狀態</th>
            <th>下一步</th>
            <th>草稿</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((item) => (
              <tr key={`${item.source}-${item.title}`}>
                <td className="source-ref">{item.source}</td>
                <td className="primary-cell">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </td>
                <td>
                  <Tags item={item} />
                </td>
                <td>{item.nextSteps.map((step) => <div key={step}>{step}</div>)}</td>
                <td>
                  <button className="copy-button" type="button" onClick={() => onCopy(item.draft)}>
                    複製
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="empty-state">
                沒有符合條件的課務資料。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseTable({ rows, onCopy }: { rows: WorkbenchItem[]; onCopy: (text: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>來源</th>
            <th>請款 / 專案</th>
            <th>檢查結果</th>
            <th>金額</th>
            <th>草稿</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((item) => (
              <tr key={`${item.source}-${item.title}`}>
                <td className="source-ref">{item.source}</td>
                <td className="primary-cell">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </td>
                <td>
                  <Tags item={item} />
                  <div>{item.nextSteps.map((step) => <div key={step}>{step}</div>)}</div>
                </td>
                <td className="money">
                  表單 {formatMoney(item.total)}
                  <br />
                  明細 {formatMoney(item.detailSum)}
                </td>
                <td>
                  <button className="copy-button" type="button" onClick={() => onCopy(item.draft)}>
                    複製
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="empty-state">
                沒有符合條件的核銷資料。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
