-- Orders, their bazaars, status history and the status machine (FR-009 to FR-014, research R5).

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  folio integer generated always as identity unique,
  description text not null check (char_length(description) between 3 and 2000),
  expected_packages smallint not null check (expected_packages between 1 and 99),
  status public.order_status not null default 'registered',
  cancelled_reason text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_cancel_reason check (
    status <> 'cancelled' or char_length(coalesce(cancelled_reason, '')) > 0
  )
);

create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_bazaars (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  bazaar_id uuid references public.bazaars (id) on delete set null,
  bazaar_name text check (bazaar_name is null or char_length(bazaar_name) between 2 and 80),
  constraint order_bazaars_named check (bazaar_id is not null or bazaar_name is not null)
);

create index order_bazaars_order_idx on public.order_bazaars (order_id);
create index order_bazaars_bazaar_idx on public.order_bazaars (bazaar_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id);

-- Allowed transitions (data-model.md). Must match src/features/orders/status.ts
-- (tests/integration/order-status-sync.test.ts).
create table public.order_status_transitions (
  from_status public.order_status not null,
  to_status public.order_status not null,
  actor text not null check (actor in ('customer', 'collector', 'system')),
  primary key (from_status, to_status, actor)
);

insert into public.order_status_transitions (from_status, to_status, actor) values
  ('registered', 'payment_pending', 'system'),
  ('registered', 'payment_confirmed', 'system'),
  ('payment_pending', 'payment_confirmed', 'system'),
  ('payment_pending', 'registered', 'system'),
  ('payment_pending', 'receiving', 'system'),
  ('payment_confirmed', 'receiving', 'system'),
  ('receiving', 'complete', 'collector'),
  ('complete', 'shipped', 'system'),
  ('shipped', 'delivered', 'collector'),
  ('registered', 'cancelled', 'customer'),
  ('payment_pending', 'cancelled', 'customer'),
  ('registered', 'cancelled', 'collector'),
  ('payment_pending', 'cancelled', 'collector'),
  ('payment_confirmed', 'cancelled', 'collector'),
  ('receiving', 'cancelled', 'collector'),
  ('complete', 'cancelled', 'collector'),
  -- Anonymizing a customer's data cancels open orders (FR-047).
  ('registered', 'cancelled', 'system'),
  ('payment_pending', 'cancelled', 'system'),
  ('payment_confirmed', 'cancelled', 'system'),
  ('receiving', 'cancelled', 'system'),
  ('complete', 'cancelled', 'system');

alter table public.order_status_transitions enable row level security;
-- No policies: only the trigger below reads it.

create function public.validate_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_app_user constant boolean := current_user in ('anon', 'authenticated');
  v_actor text;
begin
  if new.customer_id is distinct from old.customer_id then
    raise exception 'No se puede cambiar la clienta de un pedido.' using errcode = 'P0001';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'No se puede cambiar quién creó el pedido.' using errcode = 'P0001';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not is_app_user then
    v_actor := 'system';
  elsif public.is_collector() then
    v_actor := 'collector';
  else
    v_actor := 'customer';
  end if;

  -- Trusted roles (sync triggers, anonymization, service role) may perform any listed change.
  if not exists (
    select 1 from public.order_status_transitions t
    where t.from_status = old.status
      and t.to_status = new.status
      and (t.actor = v_actor or v_actor = 'system')
  ) then
    raise exception 'Cambio de estado no permitido: % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;

  if v_actor = 'customer' and new.status = 'cancelled' then
    if exists (select 1 from public.payments where order_id = new.id and status = 'confirmed')
      or exists (select 1 from public.packages where order_id = new.id) then
      raise exception 'Este pedido ya tiene pagos confirmados o paquetes; pide a la recolectora que lo cancele.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger orders_validate_update
  before update on public.orders
  for each row execute function public.validate_order_update();

create function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      case
        when new.status = 'cancelled' then new.cancelled_reason
        else nullif(current_setting('app.status_note', true), '')
      end
    );
  end if;
  return new;
end;
$$;

create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- Every order keeps at least one bazaar (data-model.md). Checked at commit time.
create function public.order_has_bazaar(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (select 1 from public.orders where id = target)
    or exists (select 1 from public.order_bazaars where order_id = target);
$$;

create function public.ensure_new_order_has_bazaar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.order_has_bazaar(new.id) then
    raise exception 'El pedido debe tener al menos un bazar.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create function public.ensure_order_keeps_bazaar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.order_has_bazaar(old.order_id) then
    raise exception 'El pedido debe tener al menos un bazar.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create constraint trigger orders_need_bazaar
  after insert on public.orders
  deferrable initially deferred
  for each row execute function public.ensure_new_order_has_bazaar();

create constraint trigger order_bazaars_keep_one
  after delete on public.order_bazaars
  deferrable initially deferred
  for each row execute function public.ensure_order_keeps_bazaar();

alter table public.orders enable row level security;
alter table public.order_bazaars enable row level security;
alter table public.order_status_history enable row level security;

-- A customer always sees her orders, even when deactivated or after shipping (FR-049).
create policy "orders: read own or collector"
  on public.orders for select
  to authenticated
  using (customer_id = (select public.current_customer_id()) or (select public.is_collector()));

create policy "orders: create own while active or collector"
  on public.orders for insert
  to authenticated
  with check (
    (select public.is_collector())
    or (customer_id = (select public.current_customer_id())
        and (select public.current_customer_is_active()))
  );

create policy "orders: update own open orders while active or collector"
  on public.orders for update
  to authenticated
  using (
    (select public.is_collector())
    or (customer_id = (select public.current_customer_id())
        and (select public.current_customer_is_active())
        and status in ('registered', 'payment_pending', 'payment_confirmed', 'receiving'))
  )
  with check (
    (select public.is_collector())
    or customer_id = (select public.current_customer_id())
  );

create function public.can_edit_order(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_collector()
    or exists (
      select 1 from public.orders o
      where o.id = target
        and o.customer_id = public.current_customer_id()
        and public.current_customer_is_active()
        and o.status in ('registered', 'payment_pending', 'payment_confirmed', 'receiving')
    );
$$;

create policy "order_bazaars: read with order"
  on public.order_bazaars for select
  to authenticated
  using (
    (select public.is_collector())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select public.current_customer_id())
    )
  );

create policy "order_bazaars: insert while editable"
  on public.order_bazaars for insert
  to authenticated
  with check (public.can_edit_order(order_id));

create policy "order_bazaars: delete while editable"
  on public.order_bazaars for delete
  to authenticated
  using (public.can_edit_order(order_id));

create policy "order_status_history: read with order"
  on public.order_status_history for select
  to authenticated
  using (
    (select public.is_collector())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select public.current_customer_id())
    )
  );

-- Creates an order with its bazaars in one transaction. Runs with the caller's permissions
-- (RLS applies). bazaars: [{"bazaar_id": uuid} | {"bazaar_name": text}, ...]
create function public.create_order(
  customer_id uuid,
  description text,
  expected_packages smallint,
  bazaars jsonb
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.orders;
begin
  if jsonb_typeof(bazaars) <> 'array' or jsonb_array_length(bazaars) = 0 then
    raise exception 'El pedido debe tener al menos un bazar.' using errcode = 'P0001';
  end if;

  insert into public.orders (customer_id, description, expected_packages)
  values (create_order.customer_id, create_order.description, create_order.expected_packages)
  returning * into created;

  insert into public.order_bazaars (order_id, bazaar_id, bazaar_name)
  select created.id, (item ->> 'bazaar_id')::uuid, nullif(btrim(item ->> 'bazaar_name'), '')
  from jsonb_array_elements(bazaars) as item;

  return created;
end;
$$;

-- Replaces description, expected packages and bazaars of an editable order.
create function public.update_order(
  order_id uuid,
  description text,
  expected_packages smallint,
  bazaars jsonb
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated public.orders;
begin
  if jsonb_typeof(bazaars) <> 'array' or jsonb_array_length(bazaars) = 0 then
    raise exception 'El pedido debe tener al menos un bazar.' using errcode = 'P0001';
  end if;

  update public.orders o
    set description = update_order.description,
        expected_packages = update_order.expected_packages
    where o.id = update_order.order_id
      and o.status in ('registered', 'payment_pending', 'payment_confirmed', 'receiving')
    returning * into updated;

  if updated.id is null then
    raise exception 'El pedido no existe o ya no se puede editar.' using errcode = 'P0001';
  end if;

  delete from public.order_bazaars ob where ob.order_id = update_order.order_id;
  insert into public.order_bazaars (order_id, bazaar_id, bazaar_name)
  select update_order.order_id, (item ->> 'bazaar_id')::uuid, nullif(btrim(item ->> 'bazaar_name'), '')
  from jsonb_array_elements(bazaars) as item;

  return updated;
end;
$$;

revoke all on function public.create_order(uuid, text, smallint, jsonb) from public, anon;
revoke all on function public.update_order(uuid, text, smallint, jsonb) from public, anon;
grant execute on function public.create_order(uuid, text, smallint, jsonb) to authenticated;
grant execute on function public.update_order(uuid, text, smallint, jsonb) to authenticated;
