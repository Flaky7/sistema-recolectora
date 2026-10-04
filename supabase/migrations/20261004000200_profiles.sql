-- One profile per auth user. The role lives here, never in user metadata (research R1).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  email text,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- FR-005: customers and bazaars must accept the privacy notice to register.
  constraint profiles_privacy_accepted check (role = 'collector' or privacy_accepted_at is not null)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create function public.is_collector()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'collector'
  );
$$;

create policy "profiles: read own or collector"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_collector()));

-- No insert/update/delete policies: profiles are created by handle_new_user() and the role only
-- changes through promote_to_collector(), both SECURITY DEFINER.
