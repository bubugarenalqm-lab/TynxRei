-- Tyn.fm (kiểu My Bibi): chạy MỘT lần trong Supabase SQL Editor. An toàn khi chạy lại (xóa và tạo lại bảng).
-- Dọn bản cũ (Our Tree / music / gallery...) và bảng mới nếu có
drop table if exists activity_events, collections, comments, gallery_items, love_tree_state, memories, milestones, music_tracks, notes,
  notifications, personal_content, playlist_tracks, playlists, reactions, relationship_settings, shared_content, sheet_music,
  message_reactions, messages, pings, mood_weather, streak_log, couple_settings, profiles cascade;
drop type if exists visibility cascade;
drop function if exists set_updated_at() cascade;
drop function if exists is_member() cascade;
drop function if exists can_read_object(text, text) cascade;
drop function if exists guard_playlist_track() cascade;
drop function if exists limit_two_profiles() cascade;
drop function if exists mark_seen() cascade;
drop function if exists mark_delivered() cascade;

create extension if not exists pgcrypto;

-- Hồ sơ: đúng hai người, tạo bằng SQL (không có đăng ký)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug in ('tyn','rei')),
  display_name text not null check (length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);
create function is_member() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid()) $$;
create function limit_two_profiles() returns trigger language plpgsql as
$$ begin if (select count(*) from profiles) >= 2 then raise exception 'Chỉ cho phép hai tài khoản'; end if; return new; end $$;
create trigger profiles_limit before insert on profiles for each row execute function limit_two_profiles();
alter table profiles enable row level security;
create policy profiles_sel on profiles for select using (is_member());
create policy profiles_upd on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Cài đặt chung của hai người (ví dụ ngày bắt đầu)
create table couple_settings (
  key text primary key, value text not null,
  updated_by uuid default auth.uid() references profiles(id), updated_at timestamptz not null default now()
);
alter table couple_settings enable row level security;
create policy cs_sel on couple_settings for select using (is_member());
create policy cs_ins on couple_settings for insert with check (is_member());
create policy cs_upd on couple_settings for update using (is_member()) with check (is_member());

-- Trò chuyện
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  content text check (content is null or length(content) <= 4000),
  media_type text check (media_type in ('photo','voice','file')),
  media_path text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz, seen_at timestamptz,
  check (content is not null or media_path is not null)
);
create index on messages (created_at desc);
alter table messages enable row level security;
create policy msg_sel on messages for select using (is_member());
create policy msg_ins on messages for insert with check (sender_id = auth.uid() and is_member());
create policy msg_del on messages for delete using (sender_id = auth.uid());
-- Người nhận đánh dấu đã nhận / đã xem (client không được sửa trực tiếp bảng)
create function mark_delivered() returns void language sql security definer set search_path = public as
$$ update messages set delivered_at = now() where sender_id <> auth.uid() and delivered_at is null and is_member() $$;
create function mark_seen() returns void language sql security definer set search_path = public as
$$ update messages set seen_at = now(), delivered_at = coalesce(delivered_at, now()) where sender_id <> auth.uid() and seen_at is null and is_member() $$;

create table message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  emoji text not null check (length(emoji) <= 8),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);
alter table message_reactions replica identity full;
alter table message_reactions enable row level security;
create policy rx_sel on message_reactions for select using (is_member());
create policy rx_ins on message_reactions for insert with check (user_id = auth.uid() and is_member());
create policy rx_upd on message_reactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rx_del on message_reactions for delete using (user_id = auth.uid());

-- Điều nhỏ bé: ping, thời tiết tâm trạng (tự chọn), chuỗi ngày
create table pings (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null default auth.uid() references profiles(id) on delete cascade,
  to_user uuid not null references profiles(id) on delete cascade,
  seen_at timestamptz, created_at timestamptz not null default now()
);
alter table pings enable row level security;
create policy ping_sel on pings for select using (from_user = auth.uid() or to_user = auth.uid());
create policy ping_ins on pings for insert with check (from_user = auth.uid() and to_user <> auth.uid() and is_member());
create policy ping_upd on pings for update using (to_user = auth.uid()) with check (to_user = auth.uid());

create table mood_weather (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  mood text not null check (mood in ('sunny','cloudy','stormy')),
  day date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  unique (user_id, day)
);
alter table mood_weather enable row level security;
create policy mood_sel on mood_weather for select using (is_member());
create policy mood_ins on mood_weather for insert with check (user_id = auth.uid() and is_member());
create policy mood_upd on mood_weather for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table streak_log (
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  primary key (user_id, day)
);
alter table streak_log enable row level security;
create policy streak_sel on streak_log for select using (is_member());
create policy streak_ins on streak_log for insert with check (user_id = auth.uid() and is_member());

-- Realtime
alter publication supabase_realtime add table messages, message_reactions, pings;

-- Storage cho ảnh chat (private; đường dẫn <uid>/<tên>)
insert into storage.buckets (id, name, public, file_size_limit) values ('chat','chat',false, 15728640) on conflict (id) do nothing;
drop policy if exists chat_read on storage.objects;  drop policy if exists chat_write on storage.objects;  drop policy if exists chat_delete on storage.objects;
create policy chat_read on storage.objects for select using (bucket_id = 'chat' and is_member());
create policy chat_write on storage.objects for insert with check (bucket_id = 'chat' and is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy chat_delete on storage.objects for delete using (bucket_id = 'chat' and (storage.foldername(name))[1] = auth.uid()::text);

-- Tạo hồ sơ cho hai tài khoản đã có trong Authentication > Users
insert into profiles (id, slug, display_name) select id, 'tyn', 'Tyn' from auth.users where email = 'tyn@tynxrei.example.com' on conflict do nothing;
insert into profiles (id, slug, display_name) select id, 'rei', 'Rei' from auth.users where email = 'rei@tynxrei.example.com' on conflict do nothing;
select slug, display_name from profiles;
