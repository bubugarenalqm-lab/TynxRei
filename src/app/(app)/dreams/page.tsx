import { createClient } from "@/lib/supabase/server";
import Dreams, { type Dream, type Step } from "@/components/Dreams";
import type { Person } from "@/components/Shell";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DreamsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [d, s, p] = await Promise.all([
    sb.from("dreams").select("id,created_by,title,description,target_date,status,achieved_at").order("created_at", { ascending: false }),
    sb.from("dream_steps").select("id,dream_id,title,done").order("created_at"),
    sb.from("profiles").select("id,slug,display_name"),
  ]);
  if (d.error || s.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0004_dreams_songs.sql (xem README).</p>;
  const steps = (s.data ?? []) as (Step & { dream_id: string })[];
  const items = ((d.data ?? []) as Omit<Dream, "steps">[]).map((x) => ({ ...x, steps: steps.filter((y) => y.dream_id === x.id) }));
  const names = Object.fromEntries(((p.data ?? []) as Person[]).map((x) => [x.id, x.display_name]));
  return <Dreams meId={user?.id ?? ""} items={items} names={names} today={dayKey(new Date())} />;
}
