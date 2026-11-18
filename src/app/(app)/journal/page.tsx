import { createClient } from "@/lib/supabase/server";
import VaultCollection, { type KeyRow, type VaultConfig } from "@/components/VaultCollection";

export const dynamic = "force-dynamic";
const CFG: VaultConfig = {
  table: "journal_entries", heading: "Trang của tôi", empty: "Chưa có trang nào. Viết điều chỉ mình bạn biết.", primary: "title", secondary: "body",
  blurb: "Nhật ký riêng của bạn. Chỉ bạn đọc được: nội dung được mã hóa trên máy bạn, ngay cả người ấy hay người quản lý trang này cũng không đọc được.",
  fields: [{ key: "title", label: "Tiêu đề (tùy chọn)", type: "text", max: 150 }, { key: "body", label: "Điều muốn viết", type: "textarea", required: true, max: 20000 }],
};
export default async function JournalPage() {
  const sb = await createClient();
  const { data } = await sb.from("vault_keys").select("salt,check_blob").maybeSingle();
  return <VaultCollection cfg={CFG} keyRow={(data as KeyRow) ?? null} />;
}
