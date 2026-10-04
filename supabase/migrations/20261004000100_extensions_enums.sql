-- Extensions, enums and shared helpers (data-model.md).
-- Supabase installs extensions in the `extensions` schema; functions below qualify every name.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('collector', 'customer', 'bazaar');
create type public.customer_type as enum ('local', 'out_of_town');
create type public.customer_status as enum ('active', 'deactivated', 'deleted');
create type public.bazaar_status as enum (
  'draft', 'pending_review', 'approved', 'rejected', 'suspended', 'deleted'
);
create type public.proposal_status as enum ('draft', 'pending', 'approved', 'rejected', 'discarded');
create type public.document_status as enum ('pending', 'current', 'rejected');
create type public.bazaar_document_type as enum (
  'id_card', 'selfie', 'proof_of_address', 'registration_payment'
);
create type public.order_status as enum (
  'registered', 'payment_pending', 'payment_confirmed', 'receiving',
  'complete', 'shipped', 'delivered', 'cancelled'
);
create type public.payment_concept as enum ('initial_deposit');
create type public.payment_method as enum ('manual_transfer');
create type public.payment_status as enum ('pending', 'confirmed', 'rejected');
create type public.shipment_type as enum ('carrier', 'local_delivery', 'local_pickup');
create type public.notification_kind as enum (
  'package_received', 'package_unassigned', 'payment_confirmed', 'payment_rejected', 'order_shipped'
);
create type public.notification_channel as enum ('whatsapp_link');

-- Keeps updated_at current on every table that has it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the statement runs as a trusted database role instead of an app user: inside a
-- SECURITY DEFINER function owned by postgres, or with the service role (scripts and tests).
-- Must be inlined as `current_user` inside triggers; it is a plain (invoker) function on purpose.
create function public.is_privileged()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated');
$$;

-- Validation helpers usable in CHECK constraints.
create function public.valid_brands(brands text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select brands is not null
    and cardinality(brands) between 1 and 30
    and (select bool_and(char_length(b) between 1 and 40) from unnest(brands) as b);
$$;

create function public.paths_have_prefix(paths text[], prefix text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce((select bool_and(starts_with(p, prefix)) from unnest(paths) as p), true);
$$;
