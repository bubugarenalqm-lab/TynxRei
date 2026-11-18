import { createClient } from "@/lib/supabase/server";
import Letters, { type Letter } from "@/components/Letters";
import type { Person } from "@/components/Shell";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LettersPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [letters, people] = await Promise.all([sb.rpc("list_letters"), sb.from("profiles").select("id,slug,display_name")]);
  if (letters.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0003_capsules_letters.sql (xem README).</p>;
  const partner = ((people.data ?? []) as Person[]).find((p) => p.id !== user?.id) ?? null;
  return <Letters meId={user?.id ?? ""} partner={partner} items={(letters.data ?? []) as Letter[]} minDate={dayKey(new Date(Date.now() + 864e5))} nowISO={new Date().toISOString()} />;
}
