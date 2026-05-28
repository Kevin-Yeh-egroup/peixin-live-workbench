function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function optionalNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getAuthConfig() {
  return {
    password: requireEnv("WORKBENCH_ACCESS_PASSWORD"),
    sessionSecret: requireEnv("WORKBENCH_SESSION_SECRET"),
  };
}

export function getGoogleConfig() {
  return {
    clientEmail: requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

export function getSheetConfig() {
  return {
    course: {
      kind: "course" as const,
      label: "課務",
      title: "馴錢師財商研究中心 - 課程邀約申請表單 (回覆)",
      spreadsheetId: requireEnv("COURSE_SHEET_ID"),
      gid: requireEnv("COURSE_SHEET_GID"),
      sheetName: optionalEnv("COURSE_SHEET_NAME", "表單回應 1"),
      range: optionalEnv("COURSE_SHEET_RANGE", "'表單回應 1'!A:AR"),
      rowLimit: optionalNumberEnv("COURSE_ROW_LIMIT", 300),
    },
    expense: {
      kind: "expense" as const,
      label: "核銷",
      title: "馴錢師報帳表單 (回應)",
      spreadsheetId: requireEnv("EXPENSE_SHEET_ID"),
      gid: requireEnv("EXPENSE_SHEET_GID"),
      sheetName: optionalEnv("EXPENSE_SHEET_NAME", "表單回應 1"),
      range: optionalEnv("EXPENSE_SHEET_RANGE", "'表單回應 1'!A:BX"),
      rowLimit: optionalNumberEnv("EXPENSE_ROW_LIMIT", 600),
    },
  };
}
