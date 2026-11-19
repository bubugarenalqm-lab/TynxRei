import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SheetPlayer from "@/components/SheetPlayer";
import type { Pinned } from "@/components/SheetLibrary";
import { sheetConfig } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("our_sheets").select("id,sheet_id,name,author,note,added_by").eq("sheet_id", id).maybeSingle();
  return <SheetPlayer sheetId={id} pinned={(data as Pinned | null) ?? null} meId={user?.id ?? ""} configured={sheetConfig().configured} />;
}
