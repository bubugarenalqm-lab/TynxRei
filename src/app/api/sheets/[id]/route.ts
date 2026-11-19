import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSheet, sheetConfig } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sheetConfig().configured) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  try {
    return NextResponse.json(await fetchSheet(id), { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    const code = e instanceof Error ? e.message : "server_error";
    return NextResponse.json({ error: code }, { status: code === "not_found" ? 404 : code === "device_mismatch" || code === "expired" || code === "revoked" || code === "not_found" ? 403 : 502 });
  }
}
