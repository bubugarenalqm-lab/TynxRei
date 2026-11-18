"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BloomDay = { date: string; prompt: string; mine: string; theirs: string };

export default function Bloom({ today, prompt, mine, theirs, partnerName, history }: {
  today: string; prompt: string; mine: string | null; theirs: string | null; partnerName: string; history: BloomDay[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const a = text.trim();
    if (!a) return setErr("Hãy viết vài dòng.");
    setBusy(true); setErr(null);
    const { error } = await createClient().from("bloom_answers").insert({ prompt_date: today, prompt_text: prompt, answer: a });
    setBusy(false);
    if (error) return setErr("Không lưu được câu trả lời (có thể bạn đã trả lời hôm nay).");
    router.refresh();
  }
  const card = "rounded-3xl bg-card p-6 shadow-soft";
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Hoa mỗi ngày</h1>
      <section className={`${card} mt-6 max-w-2xl`} aria-label="Câu hỏi hôm nay">
        <p className="text-sm text-muted">Câu hỏi hôm nay</p>
        <p className="mt-1 font-display text-2xl">{prompt}</p>
        {mine === null ? (
          <div className="mt-4 space-y-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={3000} aria-label="Câu trả lời của bạn" className="w-full rounded-2xl border border-line bg-bg px-4 py-3" />
            {err && <p role="alert" className="text-sm text-brand">{err}</p>}
            <button onClick={submit} disabled={busy} className="rounded-full bg-brand px-6 py-2 font-medium text-white disabled:opacity-60">{busy ? "Đang lưu…" : "Gửi câu trả lời"}</button>
            <p className="text-xs text-muted">Câu trả lời của {partnerName} chỉ hiện ra sau khi bạn trả lời.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-brand-soft p-4"><p className="text-xs text-muted">Bạn</p><p className="mt-1 whitespace-pre-wrap">{mine}</p></div>
            {theirs !== null ? <div className="rounded-2xl bg-bg p-4"><p className="text-xs text-muted">{partnerName}</p><p className="mt-1 whitespace-pre-wrap">{theirs}</p></div>
              : <p className="text-sm text-muted">{partnerName} chưa trả lời. Khi người ấy trả lời, câu trả lời sẽ hiện ở đây.</p>}
          </div>)}
      </section>
      {history.length > 0 && <section className="mt-8 max-w-2xl" aria-label="Những ngày đã nở hoa"><h2 className="font-display text-2xl">Những ngày đã nở hoa</h2>
        <ul className="mt-3 space-y-3">{history.map((h) => (<li key={h.date} className={card}>
          <p className="text-xs text-muted">{new Date(h.date + "T00:00:00").toLocaleDateString("vi-VN")}</p><p className="font-medium">{h.prompt}</p>
          <p className="mt-2 text-sm"><span className="text-muted">Bạn: </span>{h.mine}</p><p className="mt-1 text-sm"><span className="text-muted">{partnerName}: </span>{h.theirs}</p></li>))}</ul></section>}
    </div>
  );
}
