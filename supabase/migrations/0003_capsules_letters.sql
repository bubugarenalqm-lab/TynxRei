-- Giai đoạn C: Hộp thời gian + Thư. Chạy sau 0002. Nội dung bị niêm phong ở phía database tới ngày mở.
create table if not exists time_capsules (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  message text not null check (length(message) between 1 and 8000),
  unlock_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table time_capsules enable row level security;
drop policy if exists cap_ins on time_capsules;
-- Cố ý KHÔNG có policy select: chỉ đọc qua list_capsules() (tin nhắn bị ẩn cho tới ngày mở, kể cả với người viết)
create policy cap_ins on time_capsules for insert with check (created_by = auth.uid() and is_member() and unlock_at > now());

create or replace function list_capsules() returns table (id uuid, created_by uuid, title text, unlock_at timestamptz, created_at timestamptz, message text)
language sql stable security definer set search_path = public as $$
  select c.id, c.created_by, c.title, c.unlock_at, c.created_at, case when c.unlock_at <= now() then c.message end
  from time_capsules c where is_member() order by c.unlock_at desc $$;

create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 10000),
  deliver_at timestamptz not null, read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table letters enable row level security;
drop policy if exists letter_ins on letters;
create policy letter_ins on letters for insert with check (author_id = auth.uid() and recipient_id <> auth.uid() and is_member() and deliver_at > now());

-- Người nhận không thấy thư (kể cả việc có thư) trước ngày giao; nội dung ẩn tới ngày giao
create or replace function list_letters() returns table (id uuid, author_id uuid, recipient_id uuid, title text, deliver_at timestamptz, created_at timestamptz, read_at timestamptz, body text)
language sql stable security definer set search_path = public as $$
  select l.id, l.author_id, l.recipient_id, l.title, l.deliver_at, l.created_at, l.read_at, case when l.deliver_at <= now() then l.body end
  from letters l where is_member() and (l.author_id = auth.uid() or (l.recipient_id = auth.uid() and l.deliver_at <= now()))
  order by l.deliver_at desc $$;
create or replace function mark_letter_read(letter_id uuid) returns void language sql security definer set search_path = public as $$
  update letters set read_at = now() where id = letter_id and recipient_id = auth.uid() and deliver_at <= now() and read_at is null $$;

revoke all on function list_capsules(), list_letters(), mark_letter_read(uuid) from public, anon;
grant execute on function list_capsules(), list_letters(), mark_letter_read(uuid) to authenticated;
