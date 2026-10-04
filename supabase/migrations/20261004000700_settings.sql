-- Single-row settings: initial deposit, payment instructions and WhatsApp templates
-- (FR-040, research R19). Only the collector reads the table; customers use get_payment_info().
-- Message rule (contracts/notifications.md): a line whose variables are empty is removed.

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  initial_deposit_cents integer not null check (initial_deposit_cents > 0),
  payment_instructions text not null check (char_length(payment_instructions) between 1 and 2000),
  template_package_received text not null,
  template_package_unassigned text not null,
  template_payment_confirmed text not null,
  template_payment_rejected text not null,
  template_order_shipped text not null,
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (
  initial_deposit_cents,
  payment_instructions,
  template_package_received,
  template_package_unassigned,
  template_payment_confirmed,
  template_payment_rejected,
  template_order_shipped
) values (
  10000,
  'La recolectora debe escribir aquí los datos para depositar el anticipo (banco, CLABE, titular y concepto). Configúralo en Panel > Configuración.',
  E'¡Hola {nombre}! 📦 Recibimos un paquete de {bazar} para tu pedido #{folio}.\nLlevas {recibidos} de {esperados} paquetes.\nVe la foto aquí: {enlace}',
  E'¡Hola {nombre}! 📦 Recibimos un paquete de {bazar} a tu nombre, pero aún no tienes un pedido registrado.\nRegístralo en la app para que lo asignemos: {enlace}',
  E'¡Hola {nombre}! ✅ Confirmamos tu pago de {monto} para el pedido #{folio}.\nYa puedes pedir a los bazares que envíen tus paquetes con tu código.\nVer tu pedido: {enlace}',
  E'Hola {nombre}, no pudimos confirmar el pago de tu pedido #{folio}.\nMotivo: {motivo}\nPor favor sube un nuevo comprobante: {enlace}',
  E'¡Hola {nombre}! 🚚 Tu pedido #{folio} ya salió: {tipo}.\nPaquetería: {paqueteria}\nNúmero de guía: {guia}\nCosto de envío: {costo}'
);

alter table public.settings enable row level security;

create policy "settings: collector reads"
  on public.settings for select
  to authenticated
  using ((select public.is_collector()));

create policy "settings: collector updates"
  on public.settings for update
  to authenticated
  using ((select public.is_collector()))
  with check ((select public.is_collector()));

-- Customers see only the deposit amount and the payment instructions (FR-010, FR-040).
create function public.get_payment_info()
returns table (initial_deposit_cents integer, payment_instructions text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_collector() or public.current_customer_id() is not null) then
    raise exception 'No tienes acceso a esta información.' using errcode = '42501';
  end if;
  return query
    select s.initial_deposit_cents, s.payment_instructions from public.settings s where s.id = 1;
end;
$$;

revoke all on function public.get_payment_info() from public, anon;
grant execute on function public.get_payment_info() to authenticated;
