-- Bazaars, public-profile proposals, photos, private documents and references
-- (data-model.md; FR-024 to FR-034; research R17, R18).

create table public.bazaars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  -- Published version only. Null until the first approval publishes a proposal.
  name text check (name is null or char_length(name) between 2 and 80),
  brands text[] check (brands is null or public.valid_brands(brands)),
  link_url text check (link_url is null or link_url ~ '^https://[^\s]+$'),
  status public.bazaar_status not null default 'draft',
  status_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bazaars_published_when_listed check (
    status not in ('approved', 'suspended')
    or (name is not null and brands is not null and link_url is not null)
  ),
  constraint bazaars_reason_required check (
    status not in ('rejected', 'suspended') or char_length(coalesce(status_reason, '')) > 0
  )
);

create index bazaars_search_text_idx on public.bazaars
  using gin (search_text extensions.gin_trgm_ops);
create index bazaars_status_idx on public.bazaars (status);

create trigger bazaars_set_updated_at
  before update on public.bazaars
  for each row execute function public.set_updated_at();

create function public.bazaars_set_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := lower(extensions.unaccent(
    coalesce(new.name, '') || ' ' || coalesce(array_to_string(new.brands, ' '), '')
  ));
  return new;
end;
$$;

create trigger bazaars_search_text
  before insert or update of name, brands on public.bazaars
  for each row execute function public.bazaars_set_search_text();

create table public.bazaar_profile_proposals (
  id uuid primary key default gen_random_uuid(),
  bazaar_id uuid not null references public.bazaars (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  brands text[] not null check (public.valid_brands(brands)),
  link_url text not null check (link_url ~ '^https://[^\s]+$'),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  status public.proposal_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_photo_prefix check (
    public.paths_have_prefix(photo_paths, bazaar_id::text || '/')
  ),
  constraint proposals_reason_required check (
    status <> 'rejected' or char_length(coalesce(rejection_reason, '')) > 0
  )
);

create unique index proposals_one_open_per_bazaar
  on public.bazaar_profile_proposals (bazaar_id)
  where status in ('draft', 'pending');

create trigger proposals_set_updated_at
  before update on public.bazaar_profile_proposals
  for each row execute function public.set_updated_at();

create table public.bazaar_photos (
  id uuid primary key default gen_random_uuid(),
  bazaar_id uuid not null references public.bazaars (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (bazaar_id, position),
  constraint bazaar_photos_prefix check (starts_with(storage_path, bazaar_id::text || '/'))
);

create table public.bazaar_documents (
  id uuid primary key default gen_random_uuid(),
  bazaar_id uuid not null references public.bazaars (id) on delete cascade,
  type public.bazaar_document_type not null,
  storage_path text,
  status public.document_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bazaar_documents_path check (
    (status = 'rejected' and storage_path is null)
    or (status <> 'rejected' and storage_path is not null
        and starts_with(storage_path, bazaar_id::text || '/'))
  ),
  constraint bazaar_documents_reason_required check (
    status <> 'rejected' or char_length(coalesce(rejection_reason, '')) > 0
  )
);

create unique index bazaar_documents_one_current
  on public.bazaar_documents (bazaar_id, type) where status = 'current';
create unique index bazaar_documents_one_pending
  on public.bazaar_documents (bazaar_id, type) where status = 'pending';

create trigger bazaar_documents_set_updated_at
  before update on public.bazaar_documents
  for each row execute function public.set_updated_at();

create table public.bazaar_references (
  id uuid primary key default gen_random_uuid(),
  bazaar_id uuid not null references public.bazaars (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (phone ~ '^[0-9]{10}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bazaar_id, position)
);

create trigger bazaar_references_set_updated_at
  before update on public.bazaar_references
  for each row execute function public.set_updated_at();

create function public.current_bazaar_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.bazaars where profile_id = (select auth.uid());
$$;

create function public.current_bazaar_status()
returns public.bazaar_status
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.bazaars where profile_id = (select auth.uid());
$$;

-- State machine and column guard for bazaars (data-model.md, "Transiciones").
create function public.validate_bazaar_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_app_user constant boolean := current_user in ('anon', 'authenticated');
  actor_is_collector constant boolean := public.is_collector();
  missing text[] := '{}';
begin
  -- Bazaars never edit their published data or review fields directly (FR-028).
  if is_app_user and not actor_is_collector then
    if new.name is distinct from old.name
      or new.brands is distinct from old.brands
      or new.link_url is distinct from old.link_url
      or new.status_reason is distinct from old.status_reason
      or new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by
      or new.profile_id is distinct from old.profile_id then
      raise exception 'No puedes modificar estos datos del bazar.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status in ('draft', 'rejected') and new.status = 'pending_review' then
    if is_app_user and (actor_is_collector or old.profile_id is distinct from auth.uid()) then
      raise exception 'Solo el bazar puede enviar su registro a revisión.' using errcode = 'P0001';
    end if;

    if not exists (
      select 1 from public.bazaar_profile_proposals
      where bazaar_id = new.id and status = 'draft'
    ) then
      missing := missing || 'datos públicos (nombre, marcas y link)'::text;
    end if;
    if (select count(distinct type) from public.bazaar_documents
        where bazaar_id = new.id and status in ('pending', 'current')) < 4 then
      missing := missing || 'los 4 documentos'::text;
    end if;
    if (select count(*) from public.bazaar_references where bazaar_id = new.id) < 3 then
      missing := missing || 'las 3 referencias'::text;
    end if;
    if cardinality(missing) > 0 then
      raise exception 'Falta: %', array_to_string(missing, ', ')
        using errcode = 'P0001', hint = 'BAZAAR_INCOMPLETE';
    end if;

    new.submitted_at := now();
    new.status_reason := null;
    update public.bazaar_profile_proposals
      set status = 'pending', submitted_at = now()
      where bazaar_id = new.id and status = 'draft';
    return new;
  end if;

  if new.status = 'deleted' then
    if is_app_user then
      raise exception 'La eliminación de un bazar se hace con la acción de eliminar datos.'
        using errcode = 'P0001';
    end if;
    update public.bazaar_profile_proposals
      set status = 'discarded'
      where bazaar_id = new.id and status in ('draft', 'pending');
    return new;
  end if;

  if is_app_user and not actor_is_collector then
    raise exception 'Solo la recolectora puede cambiar el estado del bazar.' using errcode = 'P0001';
  end if;

  if (old.status = 'pending_review' and new.status in ('approved', 'rejected'))
    or (old.status = 'approved' and new.status = 'suspended')
    or (old.status = 'suspended' and new.status = 'approved') then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  else
    raise exception 'Cambio de estado no permitido: % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;

  if new.status = 'rejected' then
    -- The bazaar fixes its data and resubmits (spec, edge case "Bazar rechazado").
    update public.bazaar_profile_proposals
      set status = 'draft', submitted_at = null
      where bazaar_id = new.id and status = 'pending';
  elsif new.status = 'suspended' then
    update public.bazaar_profile_proposals
      set status = 'discarded'
      where bazaar_id = new.id and status in ('draft', 'pending');
  elsif old.status = 'pending_review' and new.status = 'approved' then
    -- First approval: every document under review becomes current (FR-032).
    update public.bazaar_documents
      set status = 'current', reviewed_at = now(), reviewed_by = auth.uid()
      where bazaar_id = new.id and status = 'pending';
  end if;

  if new.status = 'approved' then
    new.status_reason := null;
  end if;

  return new;
end;
$$;

create trigger bazaars_validate_update
  before update on public.bazaars
  for each row execute function public.validate_bazaar_update();

-- Proposals: bazaars may only edit their own drafts; collectors review pending ones.
create function public.guard_proposal_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_collector() then
    if public.current_bazaar_status() in ('suspended', 'deleted') then
      raise exception 'Tu bazar está dado de baja; no puedes proponer cambios.'
        using errcode = 'P0001';
    end if;
    if tg_op = 'INSERT' and new.status <> 'draft' then
      raise exception 'Las propuestas se crean como borrador.' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' then
      -- A pending proposal can only be withdrawn (discarded) before proposing a new one.
      if old.status = 'pending' and new.status = 'discarded' then
        return new;
      end if;
      if old.status <> 'draft' then
        raise exception 'Solo puedes editar una propuesta en borrador.' using errcode = 'P0001';
      end if;
      -- An approved bazaar submits its draft (draft -> pending) or discards it.
      if new.status not in ('draft', 'pending', 'discarded') then
        raise exception 'Cambio de estado de propuesta no permitido.' using errcode = 'P0001';
      end if;
      if new.status = 'pending' then
        if (select status from public.bazaars where id = new.bazaar_id) <> 'approved' then
          raise exception 'Para enviar tu primer registro usa "Enviar a revisión".'
            using errcode = 'P0001';
        end if;
        new.submitted_at := now();
      end if;
      if new.reviewed_at is distinct from old.reviewed_at
        or new.reviewed_by is distinct from old.reviewed_by
        or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'No puedes modificar la revisión de la propuesta.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'rejected' then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger proposals_guard_change
  before insert or update on public.bazaar_profile_proposals
  for each row execute function public.guard_proposal_change();

-- Documents: bazaars only add new versions under review (FR-032 to FR-034).
create function public.guard_document_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_collector() then
    if public.current_bazaar_status() in ('suspended', 'deleted') then
      raise exception 'Tu bazar está dado de baja; no puedes subir documentos.'
        using errcode = 'P0001';
    end if;
    if tg_op = 'INSERT' and new.status <> 'pending' then
      raise exception 'Los documentos nuevos quedan en revisión.' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' then
      raise exception 'No puedes modificar un documento enviado.' using errcode = 'P0001';
    end if;
    if tg_op = 'DELETE' and old.status <> 'pending' then
      raise exception 'Solo puedes reemplazar un documento en revisión.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger bazaar_documents_guard_change
  before insert or update or delete on public.bazaar_documents
  for each row execute function public.guard_document_change();

-- References: editable by the bazaar in any state except deleted, also while suspended (FR-028).
create function public.guard_reference_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_collector()
    and public.current_bazaar_status() = 'deleted' then
    raise exception 'Este bazar fue eliminado.' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger bazaar_references_guard_change
  before insert or update or delete on public.bazaar_references
  for each row execute function public.guard_reference_change();

alter table public.bazaars enable row level security;
alter table public.bazaar_profile_proposals enable row level security;
alter table public.bazaar_photos enable row level security;
alter table public.bazaar_documents enable row level security;
alter table public.bazaar_references enable row level security;

create policy "bazaars: read own or collector"
  on public.bazaars for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_collector()));

-- The bazaar may only update its own row; validate_bazaar_update() limits it to submitting.
create policy "bazaars: update own or collector"
  on public.bazaars for update
  to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_collector()))
  with check (profile_id = (select auth.uid()) or (select public.is_collector()));

create policy "proposals: read own or collector"
  on public.bazaar_profile_proposals for select
  to authenticated
  using (bazaar_id = (select public.current_bazaar_id()) or (select public.is_collector()));

create policy "proposals: bazaar creates own"
  on public.bazaar_profile_proposals for insert
  to authenticated
  with check (bazaar_id = (select public.current_bazaar_id()));

create policy "proposals: update own or collector"
  on public.bazaar_profile_proposals for update
  to authenticated
  using (bazaar_id = (select public.current_bazaar_id()) or (select public.is_collector()))
  with check (bazaar_id = (select public.current_bazaar_id()) or (select public.is_collector()));

create policy "bazaar_photos: public when approved"
  on public.bazaar_photos for select
  to anon, authenticated
  using (
    exists (select 1 from public.bazaars b where b.id = bazaar_id and b.status = 'approved')
    or bazaar_id = (select public.current_bazaar_id())
    or (select public.is_collector())
  );

create policy "bazaar_photos: collector inserts"
  on public.bazaar_photos for insert
  to authenticated
  with check ((select public.is_collector()));

create policy "bazaar_photos: collector updates"
  on public.bazaar_photos for update
  to authenticated
  using ((select public.is_collector()))
  with check ((select public.is_collector()));

create policy "bazaar_photos: collector deletes"
  on public.bazaar_photos for delete
  to authenticated
  using ((select public.is_collector()));

create policy "bazaar_documents: read own rows or collector"
  on public.bazaar_documents for select
  to authenticated
  using (bazaar_id = (select public.current_bazaar_id()) or (select public.is_collector()));

create policy "bazaar_documents: bazaar adds own"
  on public.bazaar_documents for insert
  to authenticated
  with check (bazaar_id = (select public.current_bazaar_id()));

create policy "bazaar_documents: bazaar removes own pending or collector"
  on public.bazaar_documents for delete
  to authenticated
  using (
    (bazaar_id = (select public.current_bazaar_id()) and status = 'pending')
    or (select public.is_collector())
  );

create policy "bazaar_documents: collector updates"
  on public.bazaar_documents for update
  to authenticated
  using ((select public.is_collector()))
  with check ((select public.is_collector()));

create policy "bazaar_references: read own or collector"
  on public.bazaar_references for select
  to authenticated
  using (bazaar_id = (select public.current_bazaar_id()) or (select public.is_collector()));

create policy "bazaar_references: bazaar inserts own"
  on public.bazaar_references for insert
  to authenticated
  with check (bazaar_id = (select public.current_bazaar_id()));

create policy "bazaar_references: bazaar updates own"
  on public.bazaar_references for update
  to authenticated
  using (bazaar_id = (select public.current_bazaar_id()))
  with check (bazaar_id = (select public.current_bazaar_id()));

create policy "bazaar_references: bazaar deletes own"
  on public.bazaar_references for delete
  to authenticated
  using (bazaar_id = (select public.current_bazaar_id()));
