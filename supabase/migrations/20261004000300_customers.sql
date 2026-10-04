-- Customers (clientas). profile_id is null for customers registered by the collector (FR-041).

-- 5 characters from an alphabet without 0/O/1/I (research R4).
create function public.generate_customer_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
begin
  loop
    candidate := '';
    for i in 1..5 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.customers where code = candidate);
  end loop;
  return candidate;
end;
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  code text not null unique default public.generate_customer_code()
    check (code ~ '^[2-9A-HJ-NP-Z]{5}$'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  whatsapp text unique check (whatsapp ~ '^[0-9]{10}$'),
  shipping_address text check (char_length(shipping_address) between 10 and 500),
  type public.customer_type not null,
  status public.customer_status not null default 'active',
  -- Failed attempts to claim this customer with a wrong code at sign-up (research R22).
  claim_failed_attempts smallint not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_contact_unless_deleted check (
    status = 'deleted' or (whatsapp is not null and shipping_address is not null)
  )
);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.customers where profile_id = (select auth.uid());
$$;

create function public.current_customer_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.customers
    where profile_id = (select auth.uid()) and status = 'active'
  );
$$;

-- Column guard: the code never changes; a customer may only edit whatsapp, address and type.
create function public.guard_customer_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    raise exception 'El código de clienta no se puede cambiar.' using errcode = 'P0001';
  end if;

  if current_user in ('anon', 'authenticated') and not public.is_collector() then
    if new.profile_id is distinct from old.profile_id
      or new.created_by is distinct from old.created_by
      or new.full_name is distinct from old.full_name
      or new.status is distinct from old.status
      or new.claim_failed_attempts is distinct from old.claim_failed_attempts
      or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Solo puedes cambiar tu WhatsApp, dirección y tipo de clienta.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger customers_guard_update
  before update on public.customers
  for each row execute function public.guard_customer_update();

alter table public.customers enable row level security;

create policy "customers: read own or collector"
  on public.customers for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_collector()));

create policy "customers: collector creates"
  on public.customers for insert
  to authenticated
  with check ((select public.is_collector()));

create policy "customers: update own while active or collector"
  on public.customers for update
  to authenticated
  using (
    (select public.is_collector())
    or (profile_id = (select auth.uid()) and status = 'active')
  )
  with check (
    (select public.is_collector())
    or (profile_id = (select auth.uid()) and status = 'active')
  );
