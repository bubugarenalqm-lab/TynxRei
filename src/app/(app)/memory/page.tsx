import { createClient } from "@/lib/supabase/server";
import MemoryGarden, { type Mem } from "@/components/MemoryGarden";
import type { Person } from "@/components/Shell";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const today = dayKey(new Date());
  let query = sb.from("memories").select("id,created_by,title,content,media_path,memory_date").order("memory_date", { ascending: false }).limit(200);
  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  const [mems, people, all] = await Promise.all([query, sb.from("profiles").select("id,slug,display_name"),
    sb.from("memories").select("id,memory_date").limit(2000)]);
  if (mems.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0002_memories_bloom.sql (xem README).</p>;
  const names = new Map(((people.data ?? []) as Person[]).map((p) => [p.id, p.display_name]));
  const items: Mem[] = (mems.data ?? []).map((m) => ({ ...m, author: names.get(m.created_by) ?? "" }));
  const onThisDay = (all.data ?? []).filter((m) => (m.memory_date as string).slice(5) === today.slice(5) && (m.memory_date as string).slice(0, 4) !== today.slice(0, 4)).map((m) => m.id as string);
  return <MemoryGarden meId={user?.id ?? ""} items={items} today={today} q={q} onThisDay={onThisDay} />;
}
