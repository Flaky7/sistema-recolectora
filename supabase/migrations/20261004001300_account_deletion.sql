-- Deleting personal data (FR-046 to FR-048, research R16). Business rows (orders, payments,
-- packages, shipments) are kept without personal data; the functions return the Storage files
-- to delete, which the Server Action removes before deleting the Auth user.

-- Customer: the owner (only without orders in progress) or the collector (cancels them).
create function public.anonymize_customer(customer_id uuid)
returns table (bucket text, path text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.customers%rowtype;
  by_collector constant boolean := public.is_collector();
begin
  select * into target from public.customers c
  where c.id = anonymize_customer.customer_id
  for update;
  if not found then
    raise exception 'No encontramos a la clienta.' using errcode = 'P0001';
  end if;
  if not by_collector and target.profile_id is distinct from auth.uid() then
    raise exception 'No tienes permiso para eliminar estos datos.' using errcode = '42501';
  end if;
  if target.status = 'deleted' then
    return;
  end if;

  if not by_collector and exists (
    select 1 from public.orders o
    where o.customer_id = target.id and o.status not in ('delivered', 'cancelled')
  ) then
    raise exception 'Tienes pedidos en curso. Pide a la recolectora que los cierre antes de eliminar tu cuenta.'
      using errcode = 'P0001', hint = 'ACTIVE_ORDERS';
  end if;

  -- FR-047: orders in progress are cancelled ("shipped" ones can no longer be cancelled).
  update public.orders o
    set status = 'cancelled', cancelled_reason = 'Datos eliminados'
    where o.customer_id = target.id
      and o.status not in ('shipped', 'delivered', 'cancelled');

  return query
    select 'payment-proofs'::text, p.proof_path
    from public.payments p
    join public.orders o on o.id = p.order_id
    where o.customer_id = target.id and p.proof_path is not null
    union all
    select 'package-photos'::text, pk.photo_path
    from public.packages pk
    where pk.customer_id = target.id;

  update public.payments p
    set proof_path = null
    from public.orders o
    where o.id = p.order_id and o.customer_id = target.id and p.proof_path is not null;

  -- The messages contain her name and WhatsApp link.
  delete from public.notifications n where n.customer_id = target.id;

  update public.customers c
    set full_name = 'Clienta eliminada',
        whatsapp = null,
        shipping_address = null,
        profile_id = null,
        status = 'deleted',
        deleted_at = now()
    where c.id = target.id;
end;
$$;

-- Bazaar: the owner or the collector. The name is kept for the order history (FR-048).
create function public.anonymize_bazaar(bazaar_id uuid)
returns table (bucket text, path text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.bazaars%rowtype;
begin
  select * into target from public.bazaars b
  where b.id = anonymize_bazaar.bazaar_id
  for update;
  if not found then
    raise exception 'No encontramos el bazar.' using errcode = 'P0001';
  end if;
  if not public.is_collector() and target.profile_id is distinct from auth.uid() then
    raise exception 'No tienes permiso para eliminar estos datos.' using errcode = '42501';
  end if;
  if target.status = 'deleted' then
    return;
  end if;

  return query
    select 'bazaar-photos'::text, ph.storage_path
    from public.bazaar_photos ph where ph.bazaar_id = target.id
    union
    select 'bazaar-photo-submissions'::text, unnest(pr.photo_paths)
    from public.bazaar_profile_proposals pr where pr.bazaar_id = target.id
    union
    select 'bazaar-documents'::text, d.storage_path
    from public.bazaar_documents d where d.bazaar_id = target.id and d.storage_path is not null
    union
    select t.bucket_id, t.path
    from public.storage_trash t where t.bazaar_id = target.id;

  delete from public.bazaar_photos ph where ph.bazaar_id = target.id;
  delete from public.bazaar_profile_proposals pr where pr.bazaar_id = target.id;
  delete from public.bazaar_documents d where d.bazaar_id = target.id;
  delete from public.bazaar_references r where r.bazaar_id = target.id;
  delete from public.storage_trash t where t.bazaar_id = target.id;

  update public.bazaars b
    set status = 'deleted',
        brands = null,
        link_url = null,
        status_reason = null,
        profile_id = null
    where b.id = target.id;
end;
$$;

revoke all on function public.anonymize_customer(uuid) from public, anon;
revoke all on function public.anonymize_bazaar(uuid) from public, anon;
grant execute on function public.anonymize_customer(uuid) to authenticated;
grant execute on function public.anonymize_bazaar(uuid) to authenticated;
