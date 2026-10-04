-- Packages, shipments, notifications and the order summary view
-- (FR-016 to FR-023, FR-051, FR-055; data-model.md).

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  -- Null customer = "sin identificar"; null order = "sin pedido" (FR-017).
  customer_id uuid references public.customers (id) on delete restrict,
  order_id uuid references public.orders (id) on delete restrict,
  bazaar_id uuid references public.bazaars (id) on delete set null,
  bazaar_name text check (bazaar_name is null or char_length(bazaar_name) between 2 and 80),
  photo_path text not null,
  note text check (note is null or char_length(note) <= 500),
  received_at timestamptz not null default now(),
  received_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_order_needs_customer check (order_id is null or customer_id is not null)
);

create index packages_customer_idx on public.packages (customer_id);
create index packages_order_idx on public.packages (order_id);

create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

create function public.validate_package()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target public.orders%rowtype;
begin
  if tg_op = 'UPDATE' and new.photo_path is distinct from old.photo_path then
    raise exception 'La foto de un paquete no se puede cambiar.' using errcode = 'P0001';
  end if;

  -- Packages can only leave or join orders that are still open (spec, edge cases).
  if tg_op = 'UPDATE' and old.order_id is not null
    and new.order_id is distinct from old.order_id
    and exists (
      select 1 from public.orders o
      where o.id = old.order_id and o.status in ('shipped', 'delivered', 'cancelled')
    ) then
    raise exception 'El paquete pertenece a un pedido ya enviado o cancelado.' using errcode = 'P0001';
  end if;

  if new.order_id is not null
    and (tg_op = 'INSERT' or new.order_id is distinct from old.order_id) then
    select * into target from public.orders o where o.id = new.order_id;
    if target.customer_id is distinct from new.customer_id then
      raise exception 'El pedido no es de la misma clienta.' using errcode = 'P0001';
    end if;
    if target.status in ('shipped', 'delivered', 'cancelled') then
      raise exception 'No se pueden agregar paquetes a un pedido enviado o cancelado.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger packages_validate
  before insert or update on public.packages
  for each row execute function public.validate_package();

create function public.sync_order_from_package()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_id is not null then
    update public.orders
      set status = 'receiving'
      where id = new.order_id and status = 'payment_confirmed';
  end if;
  return null;
end;
$$;

create trigger packages_sync_order
  after insert or update of order_id on public.packages
  for each row execute function public.sync_order_from_package();

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  type public.shipment_type not null,
  carrier text check (carrier is null or char_length(carrier) between 2 and 60),
  tracking_number text check (tracking_number is null or char_length(tracking_number) between 3 and 60),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  shipped_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_carrier_fields check (
    type <> 'carrier' or (carrier is not null and tracking_number is not null)
  )
);

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

create function public.validate_shipment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  order_status public.order_status;
  customer_kind public.customer_type;
begin
  select o.status, c.type into order_status, customer_kind
  from public.orders o join public.customers c on c.id = o.customer_id
  where o.id = new.order_id;

  if order_status <> 'complete' then
    raise exception 'Marca el pedido como completo antes de registrar el envío.' using errcode = 'P0001';
  end if;
  -- In-person delivery or pickup only for local customers (FR-021).
  if new.type in ('local_delivery', 'local_pickup') and customer_kind <> 'local' then
    raise exception 'La entrega o recolección en persona solo es para clientas locales.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger shipments_validate
  before insert on public.shipments
  for each row execute function public.validate_shipment();

create function public.sync_order_from_shipment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders set status = 'shipped' where id = new.order_id and status = 'complete';
  return null;
end;
$$;

create trigger shipments_sync_order
  after insert on public.shipments
  for each row execute function public.sync_order_from_shipment();

create function public.stamp_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    update public.shipments set delivered_at = now() where order_id = new.id;
  end if;
  return null;
end;
$$;

create trigger orders_stamp_delivery
  after update of status on public.orders
  for each row execute function public.stamp_delivery();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete cascade,
  kind public.notification_kind not null,
  channel public.notification_channel not null default 'whatsapp_link',
  order_id uuid references public.orders (id) on delete set null,
  package_id uuid references public.packages (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  shipment_id uuid references public.shipments (id) on delete set null,
  body text not null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index notifications_customer_idx on public.notifications (customer_id);

alter table public.packages enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;

create policy "packages: read own or collector"
  on public.packages for select
  to authenticated
  using (
    (select public.is_collector())
    or (customer_id is not null and customer_id = (select public.current_customer_id()))
  );

create policy "packages: collector inserts"
  on public.packages for insert
  to authenticated
  with check ((select public.is_collector()));

create policy "packages: collector updates"
  on public.packages for update
  to authenticated
  using ((select public.is_collector()))
  with check ((select public.is_collector()));

create policy "shipments: read own or collector"
  on public.shipments for select
  to authenticated
  using (
    (select public.is_collector())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select public.current_customer_id())
    )
  );

create policy "shipments: collector inserts"
  on public.shipments for insert
  to authenticated
  with check ((select public.is_collector()));

create policy "shipments: collector updates"
  on public.shipments for update
  to authenticated
  using ((select public.is_collector()))
  with check ((select public.is_collector()));

create policy "notifications: collector reads"
  on public.notifications for select
  to authenticated
  using ((select public.is_collector()));

create policy "notifications: collector creates"
  on public.notifications for insert
  to authenticated
  with check ((select public.is_collector()));

-- One row per order with the counters the screens need. security_invoker keeps RLS in force.
create view public.order_summaries
with (security_invoker = true)
as
select
  o.id,
  o.folio,
  o.customer_id,
  o.description,
  o.expected_packages,
  o.status,
  o.cancelled_reason,
  o.created_at,
  o.updated_at,
  c.code as customer_code,
  c.full_name as customer_name,
  c.type as customer_type,
  c.profile_id is not null as customer_has_account,
  (select count(*) from public.packages p where p.order_id = o.id)::integer as received_packages,
  lp.status as last_payment_status,
  lp.amount_cents as last_payment_amount_cents,
  lp.rejection_reason as last_payment_rejection_reason,
  s.type as shipment_type,
  s.carrier,
  s.tracking_number,
  s.cost_cents as shipment_cost_cents,
  s.shipped_at,
  s.delivered_at
from public.orders o
join public.customers c on c.id = o.customer_id
left join lateral (
  select pay.status, pay.amount_cents, pay.rejection_reason
  from public.payments pay
  where pay.order_id = o.id
  order by pay.created_at desc
  limit 1
) lp on true
left join public.shipments s on s.order_id = o.id;
