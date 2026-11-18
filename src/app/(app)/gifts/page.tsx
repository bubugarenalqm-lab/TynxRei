import { createClient } from "@/lib/supabase/server";
import VaultCollection, { type KeyRow, type VaultConfig } from "@/components/VaultCollection";

export const dynamic = "force-dynamic";
const CFG: VaultConfig = {
  table: "gift_items", heading: "Hộp quà", empty: "Chưa có gì. Ghi lại điều bạn thích, kích cỡ, hay món bạn muốn.", primary: "name", secondary: "note", tag: "kind",
  blurb: "Danh sách riêng của bạn: điều mong muốn, kích cỡ, món yêu thích. Được mã hóa trên máy bạn và người ấy không thấy được, có chủ ý.",
  fields: [
    { key: "kind", label: "Loại", type: "select", max: 20, options: [{ value: "wish", label: "Mong muốn" }, { value: "size", label: "Kích cỡ" }, { value: "favorite", label: "Yêu thích" }] },
    { key: "name", label: "Tên", type: "text", required: true, max: 150 }, { key: "note", label: "Ghi chú", type: "textarea", max: 2000 },
  ],
};
export default async function GiftsPage() {
  const sb = await createClient();
  const { data } = await sb.from("vault_keys").select("salt,check_blob").maybeSingle();
  return <VaultCollection cfg={CFG} keyRow={(data as KeyRow) ?? null} />;
}
