-- Giai đoạn B: Vườn kỷ niệm + Hoa mỗi ngày. Chạy sau 0001. Không xóa dữ liệu.
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 150),
  content text check (content is null or length(content) <= 8000),
  media_path text,
  memory_date date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists memories_date_idx on memories (memory_date desc);
alter table memories enable row level security;
drop policy if exists mem_sel on memories; drop policy if exists mem_ins on memories; drop policy if exists mem_upd on memories; drop policy if exists mem_del on memories;
create policy mem_sel on memories for select using (is_member());
create policy mem_ins on memories for insert with check (created_by = auth.uid() and is_member());
create policy mem_upd on memories for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy mem_del on memories for delete using (created_by = auth.uid());

-- Câu trả lời chỉ hiện với người kia SAU KHI bạn cũng đã trả lời cùng ngày (RLS thực thi, không chỉ giao diện)
create table if not exists bloom_answers (
  id uuid primary key default gen_random_uuid(),
  prompt_date date not null,
  prompt_text text not null,
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  answer text not null check (length(answer) between 1 and 3000),
  created_at timestamptz not null default now(),
  unique (prompt_date, user_id)
);
create or replace function has_answered(d date) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from bloom_answers where prompt_date = d and user_id = auth.uid()) $$;
alter table bloom_answers enable row level security;
drop policy if exists bloom_sel on bloom_answers; drop policy if exists bloom_ins on bloom_answers;
create policy bloom_sel on bloom_answers for select using (is_member() and (user_id = auth.uid() or has_answered(prompt_date)));
create policy bloom_ins on bloom_answers for insert with check (user_id = auth.uid() and is_member());

insert into storage.buckets (id, name, public, file_size_limit) values ('memories','memories',false, 15728640) on conflict (id) do nothing;
drop policy if exists mem_obj_read on storage.objects; drop policy if exists mem_obj_write on storage.objects; drop policy if exists mem_obj_delete on storage.objects;
create policy mem_obj_read on storage.objects for select using (bucket_id = 'memories' and is_member());
create policy mem_obj_write on storage.objects for insert with check (bucket_id = 'memories' and is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy mem_obj_delete on storage.objects for delete using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);
