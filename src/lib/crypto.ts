"use client";
const enc = new TextEncoder(), dec = new TextDecoder();
const toB64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const CHECK = "tyn.fm-vault-ok";
export const newSalt = () => toB64(crypto.getRandomValues(new Uint8Array(16)));

/** Khóa AES-GCM 256 sinh từ mật khẩu riêng (PBKDF2-SHA256, 310.000 vòng). Không bao giờ gửi lên máy chủ. */
export async function deriveKey(pass: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: fromB64(saltB64), iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function encryptText(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return toB64(out);
}
export async function decryptText(key: CryptoKey, blob: string): Promise<string> {
  const raw = fromB64(blob);
  return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12)));
}
