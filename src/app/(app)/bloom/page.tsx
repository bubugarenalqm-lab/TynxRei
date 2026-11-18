import { createClient } from "@/lib/supabase/server";
import Bloom, { type BloomDay } from "@/components/Bloom";
import type { Person } from "@/components/Shell";
import { promptFor } from "@/lib/bloom";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BloomPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const today = dayKey(new Date());
  const [rows, people] = await Promise.all([
    sb.from("bloom_answers").select("prompt_date,prompt_text,user_id,answer").order("prompt_date", { ascending: false }).limit(120),
    sb.from("profiles").select("id,slug,display_name"),
  ]);
  if (rows.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0002_memories_bloom.sql (xem README).</p>;
  const partner = ((people.data ?? []) as Person[]).find((p) => p.id !== user?.id);
  const all = rows.data ?? [];
  const mineToday = all.find((r) => r.prompt_date === today && r.user_id === user?.id)?.answer ?? null;
  const theirsToday = all.find((r) => r.prompt_date === today && r.user_id !== user?.id)?.answer ?? null;
  const history: BloomDay[] = all.filter((r) => r.user_id === user?.id && r.prompt_date !== today).flatMap((m) => {
    const t = all.find((r) => r.prompt_date === m.prompt_date && r.user_id !== user?.id);
    return t ? [{ date: m.prompt_date as string, prompt: m.prompt_text as string, mine: m.answer as string, theirs: t.answer as string }] : [];
  });
  return <Bloom today={today} prompt={promptFor(today)} mine={mineToday} theirs={theirsToday} partnerName={partner?.display_name ?? "Người ấy"} history={history} />;
}
