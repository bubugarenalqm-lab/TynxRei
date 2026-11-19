import type { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/types";

type SB = Awaited<ReturnType<typeof createClient>>;
export type TLKind = "beginning" | "memory" | "bloom" | "letter" | "sheet";
export type TLEvent = { id: string; date: string; kind: TLKind; title: string; text?: string };
export const KIND_VI: Record<TLKind, string> = { beginning: "Khởi đầu", memory: "Kỷ niệm", bloom: "Hoa mỗi ngày", letter: "Thư", sheet: "Sheet nhạc" };

/** Mọi thứ hai bạn đã giữ lại, theo thứ tự thời gian tăng dần. Không suy đoán, chỉ gom dữ liệu có sẵn. */
export async function loadTimeline(sb: SB, meId: string): Promise<{ events: TLEvent[]; failed: boolean }> {
  const [set, mem, bloom, letters, sheets] = await Promise.all([
    sb.from("couple_settings").select("value").eq("key", "started_on").maybeSingle(),
    sb.from("memories").select("id,title,content,memory_date"),
    sb.from("bloom_answers").select("prompt_date,prompt_text,user_id"),
    sb.rpc("list_letters"),
    sb.from("our_sheets").select("id,name,author,note,created_at"),
  ]);
  const ev: TLEvent[] = [];
  const started = set.data?.value as string | undefined;
  if (started) ev.push({ id: "start", date: started, kind: "beginning", title: "Ngày hai bạn bắt đầu" });
  (mem.data ?? []).forEach((m) => ev.push({ id: `m-${m.id}`, date: m.memory_date, kind: "memory", title: m.title, text: m.content ?? undefined }));
  const all = bloom.data ?? [];
  all.filter((b) => b.user_id === meId && all.some((o) => o.prompt_date === b.prompt_date && o.user_id !== meId))
    .forEach((b) => ev.push({ id: `b-${b.prompt_date}`, date: b.prompt_date, kind: "bloom", title: b.prompt_text }));
  ((letters.data ?? []) as { id: string; title: string; deliver_at: string; body: string | null }[]).filter((l) => l.body !== null)
    .forEach((l) => ev.push({ id: `l-${l.id}`, date: dayKey(l.deliver_at), kind: "letter", title: l.title, text: l.body ?? undefined }));
  (sheets.data ?? []).forEach((s) => ev.push({ id: `s-${s.id}`, date: dayKey(s.created_at), kind: "sheet", title: s.name, text: [s.author, s.note].filter(Boolean).join(" · ") || undefined }));
  ev.sort((a, b) => a.date.localeCompare(b.date));
  return { events: ev, failed: !!mem.error };
}
