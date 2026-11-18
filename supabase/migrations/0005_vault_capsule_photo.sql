-- Giai đoạn E: ảnh trong hộp thời gian + kho mã hóa (Trang của tôi, Hộp quà). Chạy sau 0004.
alter table time_capsules add column if not exists media_path text;
drop function if exists list_capsules();
create function list_capsules() returns table (id uuid, created_by uuid, title text, unlock_at timestamptz, created_at timestamptz, message text, media_path text)
language sql stable security definer set search_path = public as $$
  select c.id, c.created_by, c.title, c.unlock_at, c.created_at,
         case when c.unlock_at <= now() then c.message end, case when c.unlock_at <= now() then c.media_path end
  from time_capsules c where is_member() order by c.unlock_at desc $$;
revoke all on function list_capsules() from public, anon;
grant execute on function list_capsules() to authenticated;

-- Khóa kho: chỉ lưu salt + một chuỗi kiểm tra đã mã hóa. Mật khẩu riêng và khóa giải mã KHÔNG bao giờ rời trình duyệt.
create table if not exists vault_keys (
  user_id uuid primary key default auth.uid() references profiles(id) on delete cascade,
  salt text not null, check_blob text not null, created_at timestamptz not null default now()
);
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  enc text not null check (length(enc) <= 200000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists gift_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  enc text not null check (length(enc) <= 20000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table vault_keys enable row level security; alter table journal_entries enable row level security; alter table gift_items enable row level security;
drop policy if exists vk_all on vault_keys; drop policy if exists je_all on journal_entries; drop policy if exists gi_all on gift_items;
-- Chỉ chủ sở hữu thấy dữ liệu (và dữ liệu đó đã được mã hóa)
create policy vk_all on vault_keys for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
create policy je_all on journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
create policy gi_all on gift_items for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
