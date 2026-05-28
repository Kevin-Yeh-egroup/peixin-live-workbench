# Security Notes

This repository is intended to be public, but the data is not public.

## Do Not Commit

- `.env.local`
- Google service account JSON
- Google private keys
- real Sheet IDs if Kevin prefers to keep them private
- exported CSV files from the live forms
- screenshots containing personal or reimbursement data

## Runtime Protection

- The UI requires `WORKBENCH_ACCESS_PASSWORD`.
- The session cookie is HttpOnly and SameSite strict.
- Google credentials are used only on the server.
- Google Sheets are read with `https://www.googleapis.com/auth/spreadsheets.readonly`.

## Current Non-Goals

- No writeback to Google Sheets.
- No email or Line sending.
- No Calendar creation.
- No Info-system automation.

Any future writeback or external send needs a separate approval and review.
