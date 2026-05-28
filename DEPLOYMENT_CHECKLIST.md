# Production Deployment Checklist

Use this before creating the public GitHub repository and Vercel Production deployment.

## Approval Gates

- [ ] Kevin approves the public GitHub repo name.
- [ ] Kevin approves pushing this local repo to GitHub.
- [ ] Kevin approves creating/linking the Vercel project.
- [ ] Kevin approves setting production environment variables.
- [ ] Kevin approves the first Production deployment.

## Suggested Names

- GitHub repo: `peixin-live-workbench`
- Vercel project: `peixin-live-workbench`
- Production URL: `https://peixin-live-workbench.vercel.app`

## Required Secrets

- [ ] `WORKBENCH_ACCESS_PASSWORD`
- [ ] `WORKBENCH_SESSION_SECRET`
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_PRIVATE_KEY`
- [ ] `COURSE_SHEET_ID`
- [ ] `COURSE_SHEET_GID`
- [ ] `EXPENSE_SHEET_ID`
- [ ] `EXPENSE_SHEET_GID`

## Google Cloud / Sheet Setup

- [ ] Google Sheets API enabled in the Google Cloud project.
- [ ] Service account created.
- [ ] Service account key created and stored only in Vercel env vars.
- [ ] Course Google Sheet shared to service account as Viewer.
- [ ] Expense Google Sheet shared to service account as Viewer.
- [ ] Sheets remain private; do not publish them to the web.

## Pre-Deploy Verification

- [ ] `npm run typecheck`
- [ ] `npm run verify:no-write`
- [ ] `npm audit --omit=dev`
- [ ] `npm run build`
- [ ] Confirm `.env.local` is absent from git.
- [ ] Confirm no real Sheet IDs or private keys are committed.

## Post-Deploy Verification

- [ ] Public URL opens login screen.
- [ ] Wrong password cannot access `/api/dashboard`.
- [ ] Correct password loads both Sheet sources.
- [ ] Vercel response includes `X-Robots-Tag: noindex, nofollow, noarchive`.
- [ ] No Sheet data is visible before login.
- [ ] Refresh only reads data; it does not change Google Sheet content.
