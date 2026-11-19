import { createClient } from "@/lib/supabase/server";
import LittleThings, { type MoodRow } from "@/components/LittleThings";
import type { Person } from "@/components/Shell";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";
const DAY = 864e5;

export default async function LittleThingsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const today = dayKey(new Date());
  const [people, set, moods] = await Promise.all([
    sb.from("profiles").select("id,slug,display_name"),
    sb.from("couple_settings").select("value").eq("key", "started_on").maybeSingle(),
    sb.from("mood_weather").select("user_id,mood,day").gte("day", new Date(Date.parse(today) - 28 * DAY).toISOString().slice(0, 10)),
  ]);
  const list = (people.data ?? []) as Person[];
  const me = list.find((p) => p.id === user?.id)!;
  const partner = list.find((p) => p.id !== me.id) ?? null;
  const started = (set.data?.value as string | undefined) ?? null;
  const days = started ? Math.floor((Date.parse(today) - Date.parse(started)) / DAY) + 1 : null;
  return <LittleThings me={me} partner={partner} today={today} startedOn={started} days={days} moods={(moods.data ?? []) as MoodRow[]} />;
}
