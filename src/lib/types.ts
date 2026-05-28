export type Severity = "danger" | "warning" | "ok";
export type ItemType = "course" | "expense";

export interface StatusTag {
  type: "danger" | "warning" | "ok" | "info";
  label: string;
}

export interface WorkbenchItem {
  type: ItemType;
  source: string;
  title: string;
  subtitle: string;
  severity: Severity;
  tags: StatusTag[];
  missing: string[];
  nextSteps: string[];
  searchText: string;
  draft: string;
  detailSum?: number;
  total?: number;
  diff?: number;
}

export interface SheetSourceSummary {
  kind: ItemType;
  label: string;
  title: string;
  sheetName: string;
  url: string;
  csvUrl: string;
  rows: number;
  columns: number;
  loadedRows: number;
}

export interface DashboardPayload {
  generatedAt: string;
  sources: SheetSourceSummary[];
  course: {
    headers: string[];
    rows: WorkbenchItem[];
  };
  expense: {
    headers: string[];
    rows: WorkbenchItem[];
  };
}

export type SheetRow = Record<string, string> & {
  __rowNumber: string;
  __filled?: string;
};
