-- Files a bazaar replaced but cannot delete itself (research R23). Deleting a Storage object
-- needs SELECT on it, and a bazaar must never read its private documents (FR-026, FR-034), so the
-- bazaar records the path here and the collector's session deletes the file when she reviews
-- that bazaar.

create table public.storage_trash (
  id uuid primary key default gen_random_uuid(),
  bazaar_id uuid not null references public.bazaars (id) on delete cascade,
  bucket_id text not null check (bucket_id = 'bazaar-documents'),
  path text not null,
  created_at timestamptz not null default now(),
  unique (bucket_id, path),
  constraint storage_trash_own_folder check (starts_with(path, bazaar_id::text || '/'))
);

create index storage_trash_bazaar_idx on public.storage_trash (bazaar_id);

alter table public.storage_trash enable row level security;

create policy "storage_trash: bazaar adds own files"
  on public.storage_trash for insert
  to authenticated
  with check (bazaar_id = (select public.current_bazaar_id()));

create policy "storage_trash: collector reads"
  on public.storage_trash for select
  to authenticated
  using ((select public.is_collector()));

create policy "storage_trash: collector empties"
  on public.storage_trash for delete
  to authenticated
  using ((select public.is_collector()));
