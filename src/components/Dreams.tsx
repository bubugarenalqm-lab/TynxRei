"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Step = { id: string; dream_id: string; title: string; done: boolean };
export type Dream = { id: string; created_by: string; title: string; description: string | null; target_date: string | null; status: "dreaming" | "achieved"; achieved_at: string | null; steps: Step[] };

export default function Dreams({ meId, items, names, today }: { meId: string; items: Dream[]; names: Record<string, string>; today: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const f = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";
  const sb = () => createClient();
  const done = async (p: PromiseLike<{ error: unknown }>, msg: string) => { const { error } = await p; if (error) setErr(msg); else { setErr(null); router.refresh(); } };

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim(), description = String(fd.get("description") ?? "").trim() || null, target = String(fd.get("target") ?? "") || null;
    if (!title) return setErr("Cần có tên giấc mơ.");
    setBusy(true);
    await done(sb().from("dreams").insert({ title, description, target_date: target }), "Không lưu được giấc mơ.");
    setBusy(false); form.reset();
  }
  async function addStep(d: Dream, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, title = String(new FormData(form).get("step") ?? "").trim();
    if (!title) return;
    await done(sb().from("dream_steps").insert({ dream_id: d.id, title }), "Không thêm được bước.");
    form.reset();
  }
  const setStatus = (d: Dream, achieved: boolean) => done(sb().from("dreams").update({ status: achieved ? "achieved" : "dreaming", achieved_at: achieved ? new Date().toISOString() : null }).eq("id", d.id), "Không cập nhật được.");
  const delDream = (d: Dream) => { if (confirm(`Xóa giấc mơ "${d.title}"?`)) void done(sb().from("dreams").delete().eq("id", d.id), "Không xóa được."); };

  const card = (d: Dream) => {
    const total = d.steps.length, dn = d.steps.filter((s) => s.done).length;
    return (
      <li key={d.id} className={`rounded-3xl p-5 shadow-soft ${d.status === "achieved" ? "bg-brand-soft" : "bg-card"}`}>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-display text-2xl">{d.title}</h3>
            <p className="text-xs text-muted">{names[d.created_by] ?? ""} mơ{d.target_date ? ` · hướng tới ${new Date(d.target_date + "T00:00:00").toLocaleDateString("vi-VN")}` : ""}{d.target_date && d.status === "dreaming" && d.target_date < today ? " · đã quá hạn" : ""}</p></div>
          {d.created_by === meId && <button onClick={() => delDream(d)} aria-label={`Xóa ${d.title}`} className="text-xs text-muted hover:text-brand">Xóa</button>}
        </div>
        {d.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{d.description}</p>}
        {total > 0 && <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={dn} aria-label="Tiến độ"><div className="h-full bg-brand" style={{ width: `${(dn / total) * 100}%` }} /></div><p className="mt-1 text-xs text-muted">{dn}/{total} bước</p></div>}
        <ul className="mt-3 space-y-1">{d.steps.map((s) => (
          <li key={s.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.done} onChange={(e) => void done(sb().from("dream_steps").update({ done: e.target.checked }).eq("id", s.id), "Không cập nhật được bước.")} />
            <span className={s.done ? "text-muted line-through" : ""}>{s.title}</span></label></li>))}</ul>
        {d.status === "dreaming" && <form onSubmit={(e) => addStep(d, e)} className="mt-3 flex gap-2"><input name="step" maxLength={200} placeholder="Thêm một bước nhỏ…" aria-label={`Thêm bước cho ${d.title}`} className="flex-1 rounded-xl border border-line bg-bg px-3 py-1.5 text-sm" /><button className="rounded-xl border border-line px-3 text-sm">Thêm</button></form>}
        <button onClick={() => void setStatus(d, d.status === "dreaming")} className="mt-4 rounded-full bg-brand px-4 py-1.5 text-sm text-white">{d.status === "dreaming" ? "Đã thực hiện" : "Mở lại giấc mơ"}</button>
      </li>
    );
  };
  const dreaming = items.filter((d) => d.status === "dreaming"), achieved = items.filter((d) => d.status === "achieved");
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Giấc mơ</h1>
      <p className="mt-1 text-sm text-muted">Những điều hai bạn muốn cùng nhau làm. Cả hai đều thêm bước và đánh dấu hoàn thành được.</p>
      <form onSubmit={add} className="mt-6 max-w-xl space-y-3 rounded-3xl bg-card p-6 shadow-soft">
        <label className="block text-sm">Giấc mơ<input name="title" required maxLength={150} className={f} /></label>
        <label className="block text-sm">Mô tả (tùy chọn)<textarea name="description" rows={2} maxLength={2000} className={f} /></label>
        <label className="block text-sm">Hướng tới ngày (tùy chọn)<input name="target" type="date" className={f} /></label>
        <button disabled={busy} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">Thêm giấc mơ</button>
      </form>
      {err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}
      <section className="mt-8 max-w-2xl" aria-label="Đang mơ"><h2 className="font-display text-2xl">Đang mơ</h2>
        {dreaming.length === 0 ? <p className="mt-2 text-sm text-muted">Chưa có giấc mơ nào.</p> : <ul className="mt-3 space-y-4">{dreaming.map(card)}</ul>}</section>
      {achieved.length > 0 && <section className="mt-8 max-w-2xl" aria-label="Đã thực hiện"><h2 className="font-display text-2xl">Đã thực hiện</h2><ul className="mt-3 space-y-4">{achieved.map(card)}</ul></section>}
    </div>
  );
}
