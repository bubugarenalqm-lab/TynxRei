"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";

const ACCENTS = [["rose", "Hồng", "#E2819F"], ["lavender", "Tím", "#9F86D4"], ["sage", "Xanh sage", "#6FA98A"], ["sky", "Xanh trời", "#5E9BD6"], ["crimson", "Đỏ thẫm", "#D13F5E"], ["midnight", "Xanh đêm", "#5B6BC0"], ["peach", "Đào", "#E58E62"]] as const;
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } };

export default function SettingsForms({ meId, name }: { meId: string; name: string }) {
  const [display, setDisplay] = useState(name);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<Record<string, string>>({});
  const note = (k: string, v: string) => setMsg((p) => ({ ...p, [k]: v }));
  const card = "rounded-3xl bg-card p-6 shadow-soft";
  const inp = "rounded-xl border border-line bg-bg px-3 py-2";

  async function saveName() {
    const v = display.trim();
    if (!v || v.length > 40) return note("name", "Tên phải từ 1 đến 40 ký tự.");
    const { error } = await createClient().from("profiles").update({ display_name: v }).eq("id", meId);
    note("name", error ? "Không lưu được tên." : "Đã lưu. Tải lại trang để thấy tên mới.");
  }
  async function savePw() {
    if (pw.length < 6) return note("pw", "Mật khẩu cần ít nhất 6 ký tự.");
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (!error) setPw("");
    note("pw", error ? "Không đổi được mật khẩu." : "Đã đổi mật khẩu.");
  }
  function theme(v: "light" | "dark") { set("tf-theme", v); document.documentElement.classList.toggle("dark", v === "dark"); }
  function accent(v: string) { set("tf-accent", v); document.documentElement.dataset.accent = v; }
  function size(v: string) { set("tf-size", v); document.documentElement.dataset.textsize = v; }

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Cài đặt</h1>
      <div className="mt-6 grid max-w-2xl gap-5">
        <section className={card}><h2 className="font-medium">Tên hiển thị</h2>
          <div className="mt-3 flex flex-wrap gap-2"><input value={display} onChange={(e) => setDisplay(e.target.value)} maxLength={40} aria-label="Tên hiển thị" className={inp} />
            <button onClick={saveName} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">Lưu</button></div>
          {msg.name && <p role="status" className="mt-2 text-sm text-muted">{msg.name}</p>}</section>
        <section className={card}><h2 className="font-medium">Giao diện</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => theme("light")} className="rounded-full border border-line px-4 py-1.5 text-sm">Sáng</button>
            <button onClick={() => theme("dark")} className="rounded-full border border-line px-4 py-1.5 text-sm">Tối</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{ACCENTS.map(([k, l, c]) => <button key={k} onClick={() => accent(k)} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm"><span className="h-3 w-3 rounded-full" style={{ background: c }} />{l}</button>)}</div>
          <div className="mt-3 flex gap-2">{[["sm", "Chữ nhỏ"], ["md", "Vừa"], ["lg", "Chữ lớn"]].map(([k, l]) => <button key={k} onClick={() => size(k)} className="rounded-full border border-line px-3 py-1.5 text-sm">{l}</button>)}</div></section>
        <section className={card}><h2 className="font-medium">Đổi mật khẩu</h2>
          <div className="mt-3 flex flex-wrap gap-2"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" aria-label="Mật khẩu mới" className={inp} />
            <button onClick={savePw} className="rounded-xl bg-brand px-4 py-2 text-sm text-white">Đổi</button></div>
          {msg.pw && <p role="status" className="mt-2 text-sm text-muted">{msg.pw}</p>}</section>
        <form action={signOut}><button className="rounded-xl border border-line px-5 py-2 text-sm text-muted hover:bg-card">Đăng xuất</button></form>
      </div>
    </div>
  );
}
