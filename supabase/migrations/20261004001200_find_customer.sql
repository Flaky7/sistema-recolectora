-- Package reception search (US2, FR-016): by exact code, or partial name or WhatsApp, with
-- each customer's active orders. Only the collector may run it.

create function public.find_customer(q text)
returns table (
  id uuid,
  code text,
  full_name text,
  whatsapp text,
  type public.customer_type,
  status public.customer_status,
  has_account boolean,
  exact_code boolean,
  active_orders jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  term constant text := btrim(coalesce(q, ''));
  code_term constant text := upper(regexp_replace(term, '[\s-]', '', 'g'));
  digits constant text := regexp_replace(term, '\D', '', 'g');
  name_pattern constant text :=
    '%' || replace(replace(replace(lower(extensions.unaccent(term)), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  if not public.is_collector() then
    raise exception 'Solo la recolectora puede buscar clientas.' using errcode = '42501';
  end if;
  if char_length(term) < 2 then
    return;
  end if;

  return query
  select
    c.id,
    c.code,
    c.full_name,
    c.whatsapp,
    c.type,
    c.status,
    c.profile_id is not null,
    c.code = code_term,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', o.id,
                  'folio', o.folio,
                  'status', o.status,
                  'expected_packages', o.expected_packages,
                  'received_packages',
                    (select count(*) from public.packages p where p.order_id = o.id)
                )
                order by o.folio desc)
       from public.orders o
       where o.customer_id = c.id
         and o.status not in ('shipped', 'delivered', 'cancelled')),
      '[]'::jsonb
    )
  from public.customers c
  where c.status <> 'deleted'
    and (
      c.code = code_term
      or lower(extensions.unaccent(c.full_name)) like name_pattern
      or (char_length(digits) >= 3 and c.whatsapp like '%' || digits || '%')
    )
  order by (c.code = code_term) desc, c.full_name
  limit 20;
end;
$$;

revoke all on function public.find_customer(text) from public, anon;
grant execute on function public.find_customer(text) to authenticated;
