import { createClient } from "@/lib/supabase/server";
import SheetLibrary, { type Pinned } from "@/components/SheetLibrary";
import type { Person } from "@/components/Shell";
import { sheetConfig } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function SheetsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [p, people] = await Promise.all([sb.from("our_sheets").select("id,sheet_id,name,author,note,added_by").order("created_at", { ascending: false }), sb.from("profiles").select("id,slug,display_name")]);
  const names = Object.fromEntries(((people.data ?? []) as Person[]).map((x) => [x.id, x.display_name]));
  return <SheetLibrary configured={sheetConfig().configured} pinned={(p.data ?? []) as Pinned[]} names={names} meId={user?.id ?? ""} />;
}
