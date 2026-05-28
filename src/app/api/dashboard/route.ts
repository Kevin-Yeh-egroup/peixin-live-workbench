import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDashboardData } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getDashboardData();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取 Google Sheet 失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
