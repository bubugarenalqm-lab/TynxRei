-- Giai đoạn D: Giấc mơ + Bài hát của mình. Chạy sau 0003. Không xóa dữ liệu.
create table if not exists dreams (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 150),
  description text check (description is null or length(description) <= 2000),
  target_date date,
  status text not null default 'dreaming' check (status in ('dreaming','achieved')),
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists dream_steps (
  id uuid primary key default gen_random_uuid(),
  dream_id uuid not null references dreams(id) on delete cascade,
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dream_steps_dream_idx on dream_steps (dream_id);
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  added_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 150),
  artist text check (artist is null or length(artist) <= 150),
  url text check (url is null or (length(url) <= 500 and url ~* '^https?://')),
  note text check (note is null or length(note) <= 1000),
  created_at timestamptz not null default now()
);
alter table dreams enable row level security; alter table dream_steps enable row level security; alter table songs enable row level security;
drop policy if exists dr_sel on dreams; drop policy if exists dr_ins on dreams; drop policy if exists dr_upd on dreams; drop policy if exists dr_del on dreams;
create policy dr_sel on dreams for select using (is_member());
create policy dr_ins on dreams for insert with check (created_by = auth.uid() and is_member());
create policy dr_upd on dreams for update using (is_member()) with check (is_member());
create policy dr_del on dreams for delete using (created_by = auth.uid());
drop policy if exists ds_sel on dream_steps; drop policy if exists ds_ins on dream_steps; drop policy if exists ds_upd on dream_steps; drop policy if exists ds_del on dream_steps;
create policy ds_sel on dream_steps for select using (is_member());
create policy ds_ins on dream_steps for insert with check (created_by = auth.uid() and is_member());
create policy ds_upd on dream_steps for update using (is_member()) with check (is_member());
create policy ds_del on dream_steps for delete using (created_by = auth.uid());
drop policy if exists sg_sel on songs; drop policy if exists sg_ins on songs; drop policy if exists sg_upd on songs; drop policy if exists sg_del on songs;
create policy sg_sel on songs for select using (is_member());
create policy sg_ins on songs for insert with check (added_by = auth.uid() and is_member());
create policy sg_upd on songs for update using (added_by = auth.uid()) with check (added_by = auth.uid());
create policy sg_del on songs for delete using (added_by = auth.uid());
