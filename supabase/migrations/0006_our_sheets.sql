-- Giai đoạn F: "Bài của mình" = sheet ghim từ thư viện server của Tyn. Chạy sau 0005.
create table if not exists our_sheets (
  id uuid primary key default gen_random_uuid(),
  sheet_id integer not null unique,                      -- id trong bảng shop_sheets của server
  name text not null check (length(name) between 1 and 200),
  author text check (author is null or length(author) <= 200),
  note text check (note is null or length(note) <= 1000),
  added_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table our_sheets enable row level security;
drop policy if exists os_sel on our_sheets; drop policy if exists os_ins on our_sheets; drop policy if exists os_upd on our_sheets; drop policy if exists os_del on our_sheets;
create policy os_sel on our_sheets for select using (is_member());
create policy os_ins on our_sheets for insert with check (added_by = auth.uid() and is_member());
create policy os_upd on our_sheets for update using (added_by = auth.uid()) with check (added_by = auth.uid());
create policy os_del on our_sheets for delete using (added_by = auth.uid());
