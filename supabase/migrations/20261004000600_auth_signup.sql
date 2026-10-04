-- Sign-up: profile, customer or bazaar rows; linking a customer registered by the collector;
-- and promotion of the collector account (research R1, R2, R22; FR-003, FR-044).

-- After this many wrong codes for the same WhatsApp, claiming is locked until the collector
-- resets claim_failed_attempts (research R22).
create function public.customer_claim_max_attempts()
returns smallint
language sql
immutable
set search_path = ''
as $$
  select 10::smallint;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta constant jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role constant text := meta ->> 'role';
  accepted_privacy constant boolean := coalesce((meta ->> 'privacy_accepted')::boolean, false);
  whatsapp_value text;
  code_value text;
  existing public.customers%rowtype;
begin
  -- Only customers and bazaars can sign up; the collector is promoted manually (FR-003).
  if requested_role is null or requested_role not in ('customer', 'bazaar') then
    raise exception 'INVALID_ROLE' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, role, email, privacy_accepted_at)
  values (
    new.id,
    requested_role::public.user_role,
    new.email,
    case when accepted_privacy then now() end
  );

  if requested_role = 'bazaar' then
    insert into public.bazaars (profile_id) values (new.id);
    return new;
  end if;

  whatsapp_value := meta ->> 'whatsapp';
  code_value := upper(nullif(btrim(coalesce(meta ->> 'customer_code', '')), ''));

  select * into existing from public.customers where whatsapp = whatsapp_value for update;

  if found then
    if existing.profile_id is not null then
      raise exception 'ACCOUNT_EXISTS' using errcode = 'P0001';
    end if;
    if existing.claim_failed_attempts >= public.customer_claim_max_attempts() then
      raise exception 'CLAIM_LOCKED' using errcode = 'P0001';
    end if;
    if code_value is distinct from existing.code then
      raise exception 'CODE_REQUIRED' using errcode = 'P0001';
    end if;
    update public.customers
      set profile_id = new.id, claim_failed_attempts = 0
      where id = existing.id;
  else
    insert into public.customers (profile_id, created_by, full_name, whatsapp, shipping_address, type)
    values (
      new.id,
      new.id,
      meta ->> 'full_name',
      whatsapp_value,
      meta ->> 'shipping_address',
      (meta ->> 'type')::public.customer_type
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form react before submitting. Reveals only whether the WhatsApp exists
-- (constitution 1.2.0, principle III exception); never returns customer data.
-- Results: 'free' | 'code_required' | 'ok' | 'has_account' | 'locked'.
create function public.check_customer_claim(whatsapp text, code text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  existing public.customers%rowtype;
  normalized_code constant text := upper(nullif(btrim(coalesce(code, '')), ''));
begin
  select * into existing from public.customers c where c.whatsapp = check_customer_claim.whatsapp
    for update;

  if not found then
    return 'free';
  end if;
  if existing.profile_id is not null then
    return 'has_account';
  end if;
  if existing.claim_failed_attempts >= public.customer_claim_max_attempts() then
    return 'locked';
  end if;
  if normalized_code is null then
    return 'code_required';
  end if;
  if normalized_code = existing.code then
    return 'ok';
  end if;

  update public.customers
    set claim_failed_attempts = claim_failed_attempts + 1
    where id = existing.id;
  return 'code_required';
end;
$$;

revoke all on function public.check_customer_claim(text, text) from public;
grant execute on function public.check_customer_claim(text, text) to anon, authenticated;

-- Run manually in the SQL editor after the collector signs up as a customer with her email and
-- confirms it (README). Not exposed through the API.
create function public.promote_to_collector(email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select p.id into target_id
  from public.profiles p
  where lower(p.email) = lower(promote_to_collector.email);

  if target_id is null then
    raise exception 'No existe un usuario con el correo %', promote_to_collector.email;
  end if;

  if exists (
    select 1 from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.profile_id = target_id
  ) then
    raise exception 'La cuenta tiene pedidos como clienta; usa otro correo para la recolectora.';
  end if;

  delete from public.customers where profile_id = target_id;
  delete from public.bazaars where profile_id = target_id and status = 'draft';

  update public.profiles
    set role = 'collector', privacy_accepted_at = coalesce(privacy_accepted_at, now())
    where id = target_id;
end;
$$;

revoke all on function public.promote_to_collector(text) from public, anon, authenticated;
