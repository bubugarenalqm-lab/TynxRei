import { createClient } from "@/lib/supabase/server";
import Capsules, { type Capsule } from "@/components/Capsules";
import type { Person } from "@/components/Shell";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
  const sb = await createClient();
  const [caps, people] = await Promise.all([sb.rpc("list_capsules"), sb.from("profiles").select("id,slug,display_name")]);
  if (caps.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0003_capsules_letters.sql (xem README).</p>;
  const names = Object.fromEntries(((people.data ?? []) as Person[]).map((p) => [p.id, p.display_name]));
  return <Capsules items={(caps.data ?? []) as Capsule[]} names={names} minDate={dayKey(new Date(Date.now() + 864e5))} nowISO={new Date().toISOString()} />;
}
