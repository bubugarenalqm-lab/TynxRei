"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";
import type { Person } from "./Shell";

type Mood = "sunny" | "cloudy" | "stormy";
const MOODS: { key: Mood; label: string; cls: string }[] = [
  { key: "sunny", label: "Nắng", cls: "bg-amber-300" }, { key: "cloudy", label: "Mây", cls: "bg-slate-300" }, { key: "stormy", label: "Giông", cls: "bg-indigo-400" },
];
export type MoodRow = { user_id: string; mood: Mood; day: string };

export default function LittleThings({ me, partner, today, startedOn, days, moods }: {
  me: Person; partner: Person | null; today: string; startedOn: string | null; days: number | null; moods: MoodRow[];
}) {
  const [rows, setRows] = useState(moods);
  const [start, setStart] = useState(startedOn ?? "");
  const [editing, setEditing] = useState(!startedOn);
  const [startMsg, setStartMsg] = useState<string | null>(null);
  const [pingMsg, setPingMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shownDays, setShownDays] = useState(days);
  const mine = (day: string) => rows.find((r) => r.user_id === me.id && r.day === day)?.mood;
  const theirs = partner ? rows.find((r) => r.user_id === partner.id && r.day === today)?.mood : undefined;

  async function setMood(mood: Mood) {
    setErr(null);
    const { error } = await createClient().from("mood_weather").upsert({ mood, day: today }, { onConflict: "user_id,day" });
    if (error) return setErr("Không lưu được thời tiết.");
    setRows((p) => [...p.filter((r) => !(r.user_id === me.id && r.day === today)), { user_id: me.id, mood, day: today }]);
  }
  async function ping() {
    if (!partner) return;
    setPingMsg(null);
    const { error } = await createClient().from("pings").insert({ to_user: partner.id });
    setPingMsg(error ? "Không gửi được." : `Đã báo ${partner.display_name} là bạn đang nghĩ về người ấy.`);
  }
  async function saveStart() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return setStartMsg("Hãy chọn một ngày hợp lệ.");
    const { error } = await createClient().from("couple_settings").upsert({ key: "started_on", value: start, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return setStartMsg("Không lưu được ngày.");
    setShownDays(Math.floor((Date.parse(today) - Date.parse(start)) / 864e5) + 1); setStartMsg("Đã lưu."); setEditing(false);
  }
  const grid = Array.from({ length: 28 }, (_, i) => new Date(Date.parse(today) - (27 - i) * 864e5).toISOString().slice(0, 10));
  const card = "rounded-3xl border border-line bg-card p-6 shadow-soft";
  const Stat = ({ icon, n, label, sub }: { icon: string; n: number | string; label: string; sub: string }) => (
    <div className={`${card} text-center`}><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand"><Icon name={icon} /></div>
      <p className="mt-3 font-display text-4xl">{n}</p><p className="font-medium">{label}</p><p className="text-xs text-muted">{sub}</p></div>
  );
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="flex items-center gap-2 font-display text-4xl"><Icon name="heart" className="h-7 w-7 fill-current text-brand" />Điều nhỏ bé</h1>
      <p className="mt-1 text-sm text-muted">Những cử chỉ nhỏ giữ hai bạn gần nhau.</p>
      <div className="mt-6 grid max-w-3xl gap-4">
        <Stat icon="calendar" n={shownDays !== null && shownDays > 0 ? shownDays : 0} label="ngày bên nhau" sub="Cứ tiếp tục ghé thăm" />
        <section className={`${card} flex flex-wrap items-center justify-between gap-3`} aria-label="Ngày đầu tiên">
          <div className="flex items-center gap-3"><Icon name="calendar" className="h-6 w-6 text-brand" /><div><p className="font-medium">Ngày đầu tiên của hai bạn</p><p className="text-xs text-muted">Ngày câu chuyện bắt đầu</p></div></div>
          {editing ? (<div className="flex flex-wrap items-center gap-2"><input type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} aria-label="Ngày bắt đầu" className="rounded-xl border border-line bg-bg px-3 py-2 text-sm" />
            <button onClick={saveStart} className="rounded-full bg-brand px-4 py-2 text-sm text-white">Lưu</button></div>)
            : <button onClick={() => setEditing(true)} className="rounded-full bg-bg px-4 py-2 text-sm">Đổi ngày</button>}
          {startMsg && <p role="status" className="w-full text-sm text-muted">{startMsg}</p>}
        </section>
        <section className={card} aria-label="Đang nghĩ về người ấy">
          <h2 className="text-lg font-medium">Đang nghĩ về người ấy</h2><p className="mt-1 text-sm text-muted">Gửi một cái chạm nhẹ, không cần lời nào.</p>
          <button onClick={ping} disabled={!partner} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-white disabled:opacity-50"><Icon name="bell" className="h-5 w-5" />Báo cho {partner?.display_name ?? "người ấy"}</button>
          {pingMsg && <p role="status" className="mt-3 text-sm text-muted">{pingMsg}</p>}
        </section>
        <section className={card} aria-label="Thời tiết hôm nay">
          <h2 className="text-lg font-medium">Hôm nay bạn thấy thế nào?</h2><p className="mt-1 text-sm text-muted">Đây là lời tự chia sẻ của bạn, không phải bản báo cáo gửi cho người ấy.</p>
          <div className="mt-4 flex flex-wrap gap-2">{MOODS.map((m) => (
            <button key={m.key} onClick={() => setMood(m.key)} aria-pressed={mine(today) === m.key}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${mine(today) === m.key ? "border-brand bg-brand-soft" : "border-line"}`}><span className={`h-3 w-3 rounded-full ${m.cls}`} />{m.label}</button>))}</div>
          {err && <p role="alert" className="mt-2 text-sm text-brand">{err}</p>}
          <p className="mt-4 text-sm text-muted">{partner?.display_name ?? "Người ấy"} hôm nay: {theirs ? MOODS.find((m) => m.key === theirs)?.label : "chưa chọn"}</p>
          <p className="mt-4 text-xs text-muted">28 ngày của bạn</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5">{grid.map((d) => { const mm = mine(d); return <span key={d} title={`${d}: ${mm ? MOODS.find((x) => x.key === mm)?.label : "trống"}`} className={`aspect-square rounded-md ${mm ? MOODS.find((x) => x.key === mm)?.cls : "bg-line"}`} />; })}</div>
        </section>
      </div>
    </div>
  );
}
