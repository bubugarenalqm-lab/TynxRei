"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TZ } from "@/lib/types";
import type { Person } from "./Shell";

export type Letter = { id: string; author_id: string; recipient_id: string; title: string; deliver_at: string; created_at: string; read_at: string | null; body: string | null };
const d = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ });

export default function Letters({ meId, partner, items, minDate, nowISO }: { meId: string; partner: Person | null; items: Letter[]; minDate: string; nowISO: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const f = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";
  const received = items.filter((l) => l.recipient_id === meId && l.body !== null);
  const sent = items.filter((l) => l.author_id === meId);
  const unread = received.filter((l) => !l.read_at).map((l) => l.id).join(",");

  useEffect(() => {
    if (!unread) return;
    const sb = createClient();
    void Promise.all(unread.split(",").map((id) => sb.rpc("mark_letter_read", { letter_id: id })));
  }, [unread]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!partner) return setErr("Chưa có người nhận.");
    const form = e.currentTarget, fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim(), body = String(fd.get("body") ?? "").trim(), date = String(fd.get("date") ?? "");
    if (!title || !body) return setErr("Cần có tiêu đề và nội dung.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < minDate) return setErr("Ngày giao phải ở tương lai.");
    if (!confirm(`Gửi thư tới ${partner.display_name}, giao ngày ${new Date(date + "T00:00:00").toLocaleDateString("vi-VN")}? Thư không sửa hay thu hồi được.`)) return;
    setBusy(true); setErr(null);
    const { error } = await createClient().from("letters").insert({ recipient_id: partner.id, title, body, deliver_at: `${date}T00:00:00+07:00` });
    setBusy(false);
    if (error) return setErr("Không gửi được thư.");
    form.reset(); router.refresh();
  }
  const left = (iso: string) => Math.max(1, Math.ceil((Date.parse(iso) - Date.parse(nowISO)) / 864e5));
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Thư</h1>
      <p className="mt-1 text-sm text-muted">Thư chỉ đến tay người nhận vào đúng ngày giao. Trước đó, người nhận không thấy gì cả.</p>
      <form onSubmit={submit} className="mt-6 max-w-xl space-y-3 rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="font-medium">Viết cho {partner?.display_name ?? "người ấy"}</h2>
        <label className="block text-sm">Tiêu đề<input name="title" required maxLength={120} className={f} /></label>
        <label className="block text-sm">Nội dung<textarea name="body" required rows={6} maxLength={10000} className={f} /></label>
        <label className="block text-sm">Ngày giao<input name="date" type="date" min={minDate} required className={f} /></label>
        {err && <p role="alert" className="text-sm text-brand">{err}</p>}
        <button disabled={busy || !partner} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">{busy ? "Đang gửi…" : "Gửi thư"}</button>
      </form>
      <section className="mt-8 max-w-2xl" aria-label="Thư gửi bạn"><h2 className="font-display text-2xl">Thư gửi bạn</h2>
        {received.length === 0 ? <p className="mt-2 text-sm text-muted">Chưa có thư nào được giao.</p> : <ul className="mt-3 space-y-3">{received.map((l) => (
          <li key={l.id} className="rounded-3xl bg-brand-soft p-5"><p className="text-xs text-muted">Giao ngày {d(l.deliver_at)}</p><p className="font-display text-2xl">{l.title}</p><p className="mt-2 whitespace-pre-wrap">{l.body}</p></li>))}</ul>}</section>
      <section className="mt-8 max-w-2xl" aria-label="Thư bạn đã viết"><h2 className="font-display text-2xl">Thư bạn đã viết</h2>
        {sent.length === 0 ? <p className="mt-2 text-sm text-muted">Bạn chưa viết thư nào.</p> : <ul className="mt-3 space-y-3">{sent.map((l) => (
          <li key={l.id} className="rounded-3xl bg-card p-5 shadow-soft"><p className="font-medium">{l.title}</p>
            <p className="text-sm text-muted">{l.body === null ? `Đang chờ giao ngày ${d(l.deliver_at)} (còn ${left(l.deliver_at)} ngày)` : `Đã giao ngày ${d(l.deliver_at)}${l.read_at ? ` · đã được đọc ngày ${d(l.read_at)}` : " · chưa được đọc"}`}</p>
            {l.body !== null && <p className="mt-2 whitespace-pre-wrap text-sm">{l.body}</p>}</li>))}</ul>}</section>
    </div>
  );
}
