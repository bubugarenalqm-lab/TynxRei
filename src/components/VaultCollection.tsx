"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHECK, decryptText, deriveKey, encryptText, newSalt } from "@/lib/crypto";
import Icon from "./Icon";

export type Field = { key: string; label: string; type: "text" | "textarea" | "select"; options?: { value: string; label: string }[]; required?: boolean; max: number };
export type VaultConfig = { table: "journal_entries" | "gift_items"; heading: string; blurb: string; fields: Field[]; primary: string; secondary: string; tag?: string; empty: string };
export type KeyRow = { salt: string; check_blob: string } | null;
type Entry = { id: string; created_at: string; data: Record<string, string> };

let cached: CryptoKey | null = null; // chỉ giữ trong bộ nhớ trang; tải lại trang là khóa lại
const inp = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";

function Gate({ keyRow, children }: { keyRow: KeyRow; children: (key: CryptoKey, lock: () => void) => React.ReactNode }) {
  const [key, setKey] = useState<CryptoKey | null>(cached);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const creating = !keyRow;
  const lock = () => { cached = null; setKey(null); };
  if (key) return <>{children(key, lock)}</>;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), pass = String(fd.get("pass") ?? "");
    setErr(null);
    if (creating) {
      if (pass.length < 8) return setErr("Mật khẩu riêng cần ít nhất 8 ký tự.");
      if (pass !== String(fd.get("pass2") ?? "")) return setErr("Hai lần nhập chưa khớp.");
      setBusy(true);
      const salt = newSalt(), k = await deriveKey(pass, salt);
      const { error } = await createClient().from("vault_keys").insert({ salt, check_blob: await encryptText(k, CHECK) });
      setBusy(false);
      if (error) return setErr("Không tạo được kho. Hãy chạy 0005_vault_capsule_photo.sql (xem README).");
      cached = k; setKey(k);
    } else {
      setBusy(true);
      try { const k = await deriveKey(pass, keyRow.salt); if ((await decryptText(k, keyRow.check_blob)) !== CHECK) throw new Error(); cached = k; setKey(k); }
      catch { setErr("Mật khẩu riêng chưa đúng."); }
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-6 max-w-md space-y-3 rounded-3xl bg-card p-6 shadow-soft">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand"><Icon name="lock" /></div>
      <h2 className="font-display text-2xl">{creating ? "Tạo mật khẩu riêng" : "Mở khóa"}</h2>
      <p className="text-sm text-muted">{creating ? "Nội dung ở đây được mã hóa ngay trên máy bạn bằng mật khẩu này. Máy chủ chỉ giữ dữ liệu đã mã hóa. Nếu quên mật khẩu, không ai (kể cả người làm ra trang này) khôi phục được." : "Nhập mật khẩu riêng của bạn (khác mật khẩu đăng nhập)."}</p>
      <label className="block text-sm">Mật khẩu riêng<input name="pass" type="password" required autoComplete={creating ? "new-password" : "current-password"} className={inp} /></label>
      {creating && <label className="block text-sm">Nhập lại<input name="pass2" type="password" required autoComplete="new-password" className={inp} /></label>}
      {err && <p role="alert" className="text-sm text-brand">{err}</p>}
      <button disabled={busy} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">{busy ? "Đang xử lý…" : creating ? "Tạo kho" : "Mở"}</button>
    </form>
  );
}

function Items({ k, lock, cfg }: { k: CryptoKey; lock: () => void; cfg: VaultConfig }) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient().from(cfg.table).select("id,enc,created_at").order("created_at", { ascending: false });
    if (error) return setErr("Chưa đọc được dữ liệu. Hãy chạy 0005_vault_capsule_photo.sql (xem README).");
    const out: Entry[] = [];
    for (const r of data ?? []) { try { out.push({ id: r.id, created_at: r.created_at, data: JSON.parse(await decryptText(k, r.enc)) }); } catch { /* không giải mã được */ } }
    setRows(out);
  }, [k, cfg.table]);
  useEffect(() => { void load(); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget), data: Record<string, string> = {};
    for (const f of cfg.fields) { const v = String(fd.get(f.key) ?? "").trim().slice(0, f.max); if (f.required && !v) return setErr(`Cần điền: ${f.label}.`); data[f.key] = v; }
    setBusy(true); setErr(null);
    const enc = await encryptText(k, JSON.stringify(data)), sb = createClient();
    const res = editing && editing !== "new" ? await sb.from(cfg.table).update({ enc, updated_at: new Date().toISOString() }).eq("id", editing.id) : await sb.from(cfg.table).insert({ enc });
    setBusy(false);
    if (res.error) return setErr("Không lưu được.");
    setEditing(null); void load();
  }
  async function del(id: string) {
    if (!confirm("Xóa mục này? Không thể khôi phục.")) return;
    const { error } = await createClient().from(cfg.table).delete().eq("id", id);
    if (error) return setErr("Không xóa được.");
    void load();
  }
  const shown = (rows ?? []).filter((r) => !q.trim() || Object.values(r.data).join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  const tagLabel = (r: Entry) => cfg.fields.find((f) => f.key === cfg.tag)?.options?.find((o) => o.value === r.data[cfg.tag ?? ""])?.label;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setEditing(editing ? null : "new"); setErr(null); }} className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white">{editing ? "Đóng" : "Thêm mới"}</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm…" aria-label="Tìm" className="rounded-full border border-line bg-card px-4 py-2 text-sm" />
        <button onClick={lock} className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-muted"><Icon name="lock" className="h-4 w-4" />Khóa lại</button>
      </div>
      {editing && (
        <form key={editing === "new" ? "new" : editing.id} onSubmit={save} className="mt-4 max-w-xl space-y-3 rounded-3xl bg-card p-6 shadow-soft">
          {cfg.fields.map((f) => (<label key={f.key} className="block text-sm">{f.label}
            {f.type === "textarea" ? <textarea name={f.key} rows={5} maxLength={f.max} required={f.required} defaultValue={editing !== "new" ? editing.data[f.key] : ""} className={inp} />
              : f.type === "select" ? <select name={f.key} defaultValue={editing !== "new" ? editing.data[f.key] : f.options?.[0]?.value} className={inp}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : <input name={f.key} maxLength={f.max} required={f.required} defaultValue={editing !== "new" ? editing.data[f.key] : ""} className={inp} />}</label>))}
          <button disabled={busy} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">{busy ? "Đang mã hóa…" : "Lưu"}</button>
        </form>)}
      {err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}
      {rows === null ? <p className="mt-6 text-muted">Đang giải mã…</p> : shown.length === 0 ? <p className="mt-6 text-muted">{q ? "Không tìm thấy." : cfg.empty}</p> : (
        <ul className="mt-5 grid max-w-3xl gap-3">{shown.map((r) => (
          <li key={r.id} className="rounded-3xl bg-card p-5 shadow-soft"><div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString("vi-VN")}{tagLabel(r) ? ` · ${tagLabel(r)}` : ""}</p>
              <h3 className="font-display text-2xl">{r.data[cfg.primary] || new Date(r.created_at).toLocaleDateString("vi-VN")}</h3></div>
            <p className="flex gap-3 text-xs"><button onClick={() => { setEditing(r); setErr(null); window.scrollTo({ top: 0 }); }} className="text-brand">Sửa</button><button onClick={() => void del(r.id)} className="text-muted hover:text-brand">Xóa</button></p></div>
            {r.data[cfg.secondary] && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{r.data[cfg.secondary]}</p>}</li>))}</ul>)}
    </div>
  );
}

export default function VaultCollection({ cfg, keyRow }: { cfg: VaultConfig; keyRow: KeyRow }) {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">{cfg.heading}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{cfg.blurb}</p>
      <Gate keyRow={keyRow}>{(k, lock) => <Items k={k} lock={lock} cfg={cfg} />}</Gate>
    </div>
  );
}
