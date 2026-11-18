import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ev = { date: string; kind: string; title: string; text?: string };

export default async function StoryPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [mem, bloom, set] = await Promise.all([
    sb.from("memories").select("title,content,memory_date"),
    sb.from("bloom_answers").select("prompt_date,prompt_text,user_id"),
    sb.from("couple_settings").select("value").eq("key", "started_on").maybeSingle(),
  ]);
  if (mem.error || bloom.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0002_memories_bloom.sql (xem README).</p>;
  const events: Ev[] = [];
  const started = set.data?.value as string | undefined;
  if (started) events.push({ date: started, kind: "Khởi đầu", title: "Ngày hai bạn bắt đầu" });
  (mem.data ?? []).forEach((m) => events.push({ date: m.memory_date, kind: "Kỷ niệm", title: m.title, text: m.content ?? undefined }));
  const mine = (bloom.data ?? []).filter((b) => b.user_id === user?.id);
  mine.forEach((m) => { if ((bloom.data ?? []).some((b) => b.prompt_date === m.prompt_date && b.user_id !== user?.id)) events.push({ date: m.prompt_date, kind: "Hoa mỗi ngày", title: m.prompt_text }); });
  events.sort((a, b) => b.date.localeCompare(a.date));
  const groups = new Map<string, Ev[]>();
  events.forEach((e) => { const k = e.date.slice(0, 7); groups.set(k, [...(groups.get(k) ?? []), e]); });
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Câu chuyện của mình</h1>
      <p className="mt-1 text-sm text-muted">Chỉ gồm những gì hai bạn đã chọn giữ lại, không có gì được tự suy đoán.</p>
      {events.length === 0 ? <p className="mt-8 text-muted">Chưa có gì để kể. Hãy thêm kỷ niệm hoặc trả lời Hoa mỗi ngày.</p> :
        [...groups.entries()].map(([k, list]) => (
          <section key={k} className="mt-8 max-w-2xl"><h2 className="font-display text-2xl">Tháng {k.slice(5)}/{k.slice(0, 4)}</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-brand-soft pl-5">{list.map((e, i) => (
              <li key={i} className="relative rounded-2xl bg-card p-4 shadow-soft"><span className="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full bg-brand" />
                <p className="text-xs text-muted">{new Date(e.date + "T00:00:00").toLocaleDateString("vi-VN")} · {e.kind}</p>
                <p className="font-medium">{e.title}</p>{e.text && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{e.text}</p>}</li>))}</ol></section>))}
    </div>
  );
}
