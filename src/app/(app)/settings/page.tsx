import { createClient } from "@/lib/supabase/server";
import SettingsForms from "@/components/SettingsForms";

export default async function SettingsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("profiles").select("display_name").eq("id", user?.id ?? "").maybeSingle();
  return <SettingsForms meId={user?.id ?? ""} name={data?.display_name ?? ""} />;
}
