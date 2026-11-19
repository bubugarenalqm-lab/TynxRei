import crypto from "node:crypto";

/** Cấu hình đọc thư viện sheet từ server của Tyn. Chỉ chạy phía máy chủ (Vercel), không bao giờ vào trình duyệt. */
export function sheetConfig() {
  const e = process.env;
  const server = e.SHEET_SERVER_URL?.replace(/\/+$/, ""), key = e.SHEET_LICENSE_KEY, deviceId = e.SHEET_DEVICE_ID;
  const aesHex = e.SHEET_AES_KEY_HEX, shopUrl = e.SHEET_SHOP_SUPABASE_URL?.replace(/\/+$/, ""), shopAnon = e.SHEET_SHOP_ANON_KEY;
  return { server, key, deviceId, aesHex, shopUrl, shopAnon, configured: !!(server && key && deviceId && aesHex && shopUrl && shopAnon) };
}

export type SheetRow = { id: number; name: string; author: string | null; bpm: number | null };
export type Note = { t: number; k: number };
export type SheetContent = { name: string; author: string | null; bpm: number | null; notes: Note[]; durationMs: number };

export async function listSheets(q: string, offset: number): Promise<{ rows: SheetRow[]; total: number | null }> {
  const c = sheetConfig();
  const params = new URLSearchParams({ select: "id,name,author,bpm", order: "name.asc", limit: "30", offset: String(offset) });
  const term = q.replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
  if (term) params.set("or", `(name.ilike.*${term}*,author.ilike.*${term}*)`);
  const res = await fetch(`${c.shopUrl}/rest/v1/shop_sheets?${params}`, {
    headers: { apikey: c.shopAnon!, Authorization: `Bearer ${c.shopAnon}`, Prefer: "count=exact" }, cache: "no-store",
  });
  const rows = await res.json();
  if (!res.ok || !Array.isArray(rows)) throw new Error("list_failed");
  const total = Number(res.headers.get("content-range")?.split("/")[1]);
  return { rows: rows as SheetRow[], total: Number.isFinite(total) ? total : null };
}

const MASK = [16, 34, 56, 18, 62, 19, -25, 55, 15, 24, 30, 12, 30, 45, 39, -23, -10, 15, 45, -18, 37, -2, -21, 65, 25, -4, -14, 43, 23, -4, -17, -17];
function decodeNums(nums: number[]): unknown {
  let s = "";
  for (let i = 0; i < nums.length; i++) s += String.fromCharCode((nums[i] | 0) + MASK[i % MASK.length]);
  return JSON.parse(s.replace(/(].*)/, "]"));
}
function decodeAES(p: { iv: string; tag: string; data: string }, hex: string): unknown {
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("bad_aes_key");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(p.iv, "base64"));
  d.setAuthTag(Buffer.from(p.tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(p.data, "base64")), d.final()]).toString("utf8"));
}

export async function fetchSheet(id: number): Promise<SheetContent> {
  const c = sheetConfig();
  const res = await fetch(`${c.server}/api/shop/sheets/${id}/content`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: c.key, deviceId: c.deviceId }), cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; name?: string; data?: unknown };
  if (!res.ok || !body.ok) throw new Error(body.error ?? "server_error");
  let data = body.data;
  if (typeof data === "string") data = JSON.parse(data);
  if (Array.isArray(data)) data = data[0];
  const sheet = data as { name?: string; author?: string; bpm?: number; songNotes?: unknown; isEncrypted?: boolean; keyVersion?: string };
  let raw = sheet?.songNotes;
  if (sheet?.isEncrypted === true || (Array.isArray(raw) && typeof raw[0] === "number") || (raw && !Array.isArray(raw))) {
    raw = sheet.keyVersion === "Tyn" ? decodeAES(raw as { iv: string; tag: string; data: string }, c.aesHex!) : decodeNums(raw as number[]);
  }
  if (!Array.isArray(raw)) throw new Error("bad_format");
  const seen = new Set<string>(), notes: Note[] = [];
  for (const n of raw as { time?: number; key?: string }[]) {
    const m = /^[1-4]?Key(\d+)$/.exec(String(n?.key ?? "")), t = Number(n?.time), k = m ? Number(m[1]) : -1;
    if (!Number.isFinite(t) || t < 0 || k < 0 || k > 14 || seen.has(`${t}:${k}`)) continue;
    seen.add(`${t}:${k}`); notes.push({ t, k });
    if (notes.length >= 30000) break;
  }
  notes.sort((a, b) => a.t - b.t);
  return { name: sheet.name ?? body.name ?? "Không tên", author: sheet.author ?? null, bpm: typeof sheet.bpm === "number" ? sheet.bpm : null, notes, durationMs: notes.length ? notes[notes.length - 1].t : 0 };
}
