// Tạo đúng 2 tài khoản + profile + relationship_settings + love_tree_state. Chạy tại máy bạn:
// node --env-file=.env.local scripts/seed-accounts.mjs
import { createClient } from "@supabase/supabase-js";
const need = (k) => { const v = process.env[k]; if (!v) { console.error(`Thiếu biến ${k}`); process.exit(1); } return v; };
const sb = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const people = [
  { slug: "tyn", email: need("TYN_EMAIL"), password: need("TYN_PASSWORD"), name: "Tyn" },
  { slug: "her", email: need("HER_EMAIL"), password: need("HER_PASSWORD"), name: process.env.HER_DISPLAY_NAME || "Her" },
];
for (const p of people) {
  const { data, error } = await sb.auth.admin.createUser({ email: p.email, password: p.password, email_confirm: true });
  if (error) { console.error(p.slug, error.message); process.exit(1); }
  const r = await sb.from("profiles").insert({ id: data.user.id, slug: p.slug, display_name: p.name });
  if (r.error) { console.error(r.error.message); process.exit(1); }
}
await sb.from("relationship_settings").insert({ started_on: process.env.RELATIONSHIP_START || "2025-01-01" });
await sb.from("love_tree_state").insert({});
console.log("Xong. Nhớ tắt đăng ký công khai trong Supabase Auth (xem README).");
