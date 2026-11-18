import { createClient } from "@/lib/supabase/server";
import { KIND_VI, loadTimeline, type TLEvent } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { events, failed } = await loadTimeline(sb, user?.id ?? "");
  if (failed) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy các file SQL (xem README).</p>;
  const desc = [...events].reverse();
  const groups = new Map<string, TLEvent[]>();
  desc.forEach((e) => { const k = e.date.slice(0, 7); groups.set(k, [...(groups.get(k) ?? []), e]); });
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Câu chuyện của mình</h1>
      <p className="mt-1 text-sm text-muted">Mọi thứ hai bạn đã giữ lại, theo thời gian. Không có gì được tự suy đoán.</p>
      {events.length === 0 ? <p className="mt-8 text-muted">Chưa có gì để kể. Hãy thêm kỷ niệm hoặc trả lời Hoa mỗi ngày.</p> :
        [...groups.entries()].map(([k, list]) => (
          <section key={k} className="mt-8 max-w-2xl"><h2 className="font-display text-2xl">Tháng {k.slice(5)}/{k.slice(0, 4)}</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-brand-soft pl-5">{list.map((e) => (
              <li key={e.id} className="relative rounded-2xl bg-card p-4 shadow-soft"><span className="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full bg-brand" />
                <p className="text-xs text-muted">{new Date(e.date + "T00:00:00").toLocaleDateString("vi-VN")} · {KIND_VI[e.kind]}</p>
                <p className="font-medium">{e.title}</p>{e.text && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{e.text}</p>}</li>))}</ol></section>))}
    </div>
  );
}
