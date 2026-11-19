import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSheets, sheetConfig } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sheetConfig().configured) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const offset = Math.max(0, Math.min(5000, Number(req.nextUrl.searchParams.get("offset")) || 0));
  try { return NextResponse.json(await listSheets(q, offset)); }
  catch { return NextResponse.json({ error: "list_failed" }, { status: 502 }); }
}
