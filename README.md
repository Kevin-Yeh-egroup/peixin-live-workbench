# 佩欣每日工作台 Vercel 版

這是方案 B：GitHub repo 可以公開、Vercel Production URL 可以公開，但真實 Google Sheet 資料不公開。

## 架構

- Next.js App Router on Vercel
- Public production URL
- 密碼保護工作台
- Server-side API route 讀 Google Sheets
- Google service account 只放在 Vercel environment variables
- Google Sheets API 使用 read-only scope
- 前端不暴露 Google private key、service account、Sheet ID

## 安全邊界

- 不寫回 Google Sheet
- 不新增欄位
- 不排序原表
- 不刪資料
- 不發送 Email / Line
- 不建立 Calendar
- 草稿由佩欣人工複製貼上

`/api/dashboard` 只讀取 Google Sheets values，並且需通過工作台 session cookie。

## 必要設定

在 Vercel Production / Preview / Development 設定以下 env vars：

```env
WORKBENCH_ACCESS_PASSWORD=
WORKBENCH_SESSION_SECRET=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
COURSE_SHEET_ID=
COURSE_SHEET_GID=
COURSE_SHEET_NAME=表單回應 1
COURSE_SHEET_RANGE='表單回應 1'!A:AR
COURSE_ROW_LIMIT=300
EXPENSE_SHEET_ID=
EXPENSE_SHEET_GID=
EXPENSE_SHEET_NAME=表單回應 1
EXPENSE_SHEET_RANGE='表單回應 1'!A:BX
EXPENSE_ROW_LIMIT=600
```

Google private key 可放成含 `\n` 的單行字串，例如：

```text
-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Google Sheet 權限

1. 在 Google Cloud 建立 service account。
2. 啟用 Google Sheets API。
3. 產生 service account key。
4. 把兩份 Google Sheet 分享給 `GOOGLE_SERVICE_ACCOUNT_EMAIL`，權限只給 Viewer。
5. 不需要把 Sheet 改成公開。

## 本機開發

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

填好 `.env.local` 後打開 `http://localhost:3000`。

## 部署

部署到 Vercel 前，先確認：

- GitHub repo public 只包含程式碼，不包含 `.env.local`
- Vercel env vars 已設定
- service account 對兩份 Sheet 只有 Viewer 權限
- Production deployment protection / 工作台密碼已確認
- noindex header 保留

## 官方參考

- Google Sheets API read values: https://developers.google.com/workspace/sheets/api/guides/values
- Google Sheets API usage limits: https://developers.google.com/workspace/sheets/api/limits
- Google Auth Library for Node.js: https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest
- Next.js App Router: https://nextjs.org/docs/app
- Vercel environment variables: https://vercel.com/docs/environment-variables
