-- Payments: proofs uploaded by customers or payments recorded by the collector (FR-010, FR-015,
-- FR-043, FR-051). The order status follows the payment through sync_order_from_payment().

-- The configured deposit; customers cannot read the settings table (research R19). Used as the
-- column default and by prepare_payment(); returns null to anyone but customers, the collector
-- and trusted roles, so visitors and bazaars cannot learn it (FR-040).
create function public.initial_deposit_cents()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select s.initial_deposit_cents
  from public.settings s
  where s.id = 1
    and (
      -- Trusted callers (SQL scripts, seed, service role) have no app-user JWT role.
      coalesce(auth.jwt() ->> 'role', '') not in ('anon', 'authenticated')
      or public.is_collector()
      or public.current_customer_id() is not null
    );
$$;

revoke all on function public.initial_deposit_cents() from public, anon;
grant execute on function public.initial_deposit_cents() to authenticated;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  concept public.payment_concept not null default 'initial_deposit',
  method public.payment_method not null default 'manual_transfer',
  amount_cents integer not null default public.initial_deposit_cents() check (amount_cents > 0),
  proof_path text,
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  status public.payment_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_reason_required check (
    status <> 'rejected' or char_length(coalesce(rejection_reason, '')) > 0
  )
);

create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status);

-- Only one open (pending) or confirmed payment per order and concept.
create unique index payments_one_open
  on public.payments (order_id, concept)
  where status in ('pending', 'confirmed');

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Runs with the caller's role on purpose: the customer branch depends on current_user.
create function public.prepare_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_app_user constant boolean := current_user in ('anon', 'authenticated');
  order_customer uuid;
  order_status public.order_status;
begin
  select o.customer_id, o.status into order_customer, order_status
  from public.orders o where o.id = new.order_id;

  if is_app_user and not public.is_collector() then
    -- Customers upload a proof for the configured deposit; they never choose amount or status.
    new.status := 'pending';
    new.amount_cents := public.initial_deposit_cents();
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
    if new.proof_path is null then
      raise exception 'Adjunta el comprobante de pago.' using errcode = 'P0001';
    end if;
    if order_status <> 'registered' then
      raise exception 'Este pedido ya tiene un pago en revisión o confirmado.' using errcode = 'P0001';
    end if;
  else
    if new.status = 'confirmed' then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    end if;
    if order_status not in ('registered', 'payment_pending') then
      raise exception 'Este pedido ya tiene un pago confirmado.' using errcode = 'P0001';
    end if;
  end if;

  if new.proof_path is not null
    and not starts_with(new.proof_path, order_customer::text || '/') then
    raise exception 'El comprobante no pertenece a la clienta del pedido.' using errcode = 'P0001';
  end if;

  new.recorded_by := coalesce(new.recorded_by, auth.uid());
  return new;
end;
$$;

create trigger payments_prepare
  before insert on public.payments
  for each row execute function public.prepare_payment();

-- Reviewing: pending -> confirmed | rejected, by the collector only.
create function public.guard_payment_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_id is distinct from old.order_id
    or new.amount_cents is distinct from old.amount_cents
    or new.concept is distinct from old.concept
    or new.method is distinct from old.method
    -- Only anonymize_customer() (a trusted role) may clear the proof when deleting data (FR-048).
    or (new.proof_path is distinct from old.proof_path
        and (current_user in ('anon', 'authenticated') or new.proof_path is not null)) then
    raise exception 'Un pago registrado no se puede modificar.' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status then
    if old.status <> 'pending' or new.status not in ('confirmed', 'rejected') then
      raise exception 'Solo se puede confirmar o rechazar un pago pendiente.' using errcode = 'P0001';
    end if;
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger payments_guard_review
  before update on public.payments
  for each row execute function public.guard_payment_review();

create function public.sync_order_from_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.order_status;
  has_packages boolean;
begin
  select o.status into current_status from public.orders o where o.id = new.order_id;
  has_packages := exists (select 1 from public.packages p where p.order_id = new.order_id);

  if tg_op = 'INSERT' then
    if new.status = 'pending' and current_status = 'registered' then
      update public.orders set status = 'payment_pending' where id = new.order_id;
    elsif new.status = 'confirmed' and current_status in ('registered', 'payment_pending') then
      if current_status = 'registered' then
        update public.orders set status = 'payment_confirmed' where id = new.order_id;
        if has_packages then
          update public.orders set status = 'receiving' where id = new.order_id;
        end if;
      else
        update public.orders
          set status = case when has_packages then 'receiving' else 'payment_confirmed' end::public.order_status
          where id = new.order_id;
      end if;
    end if;
  elsif new.status is distinct from old.status and current_status = 'payment_pending' then
    if new.status = 'confirmed' then
      update public.orders
        set status = case when has_packages then 'receiving' else 'payment_confirmed' end::public.order_status
        where id = new.order_id;
    elsif new.status = 'rejected' then
      perform set_config('app.status_note', 'Pago rechazado: ' || new.rejection_reason, true);
      update public.orders set status = 'registered' where id = new.order_id;
      perform set_config('app.status_note', '', true);
    end if;
  end if;

  return null;
end;
$$;

create trigger payments_sync_order
  after insert or update of status on public.payments
  for each row execute function public.sync_order_from_payment();

alter table public.payments enable row level security;

create policy "payments: read own or collector"
  on public.payments for select
  to authenticated
  using (
    (select public.is_collector())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select public.current_customer_id())
    )
  );

-- Customers create only pending payments for their own orders while active (FR-049).
create policy "payments: customer uploads proof or collector records"
  on public.payments for insert
  to authenticated
  with check (
    (select public.is_collector())
    or (
      status = 'pending'
      and proof_path is not null
      and (select public.current_customer_is_active())
      and exists (
        select 1 from public.orders o
        where o.id = order_id and o.customer_id = (select public.current_customer_id())
      )
    )
  );

create policy "payments: collector reviews"
  on public.payments for update
  to authenticated
  using ((select public.is_collector()))
  with check ((select public.is_collector()));
