-- LOCAL ONLY. Loads a realistic volume to measure performance (T153, T154, SC-006, SC-007):
-- ~1,000 customers, ~3,000 orders with payments, ~6,000 packages and ~200 approved bazaars.
-- All data is fictitious. Run after `pnpm supabase db reset`:
--
--   docker exec -i supabase_db_BazarApp psql -U postgres < supabase/scripts/seed-volume.sql
--
-- Storage paths point to files that do not exist (photos show as unavailable).

begin;

-- 200 approved bazaars without an account (directory search).
insert into public.bazaars (name, brands, link_url, status, submitted_at, reviewed_at)
select
  'Bazar Volumen ' || g,
  array[
    (array['Zara', 'Shein', 'Mango', 'Bershka', 'Nike', 'Adidas', 'H&M', 'Gap', 'Pull&Bear', 'Forever 21'])[1 + g % 10],
    (array['Levi''s', 'Coach', 'Michael Kors', 'Guess', 'Puma', 'Vans', 'Converse'])[1 + g % 7]
  ],
  'https://www.facebook.com/bazarvolumen' || g,
  'approved',
  now() - (g || ' days')::interval,
  now() - (g || ' days')::interval
from generate_series(1, 200) as g;

-- 1,000 customers without an account; WhatsApp numbers 70000xxxxx are fictitious.
insert into public.customers (full_name, whatsapp, shipping_address, type)
select
  'Clienta Volumen ' || g,
  '70000' || lpad(g::text, 5, '0'),
  'Calle Ficticia ' || g || ', Col. Centro, Tijuana, B.C.',
  (case when g % 3 = 0 then 'out_of_town' else 'local' end)::public.customer_type
from generate_series(1, 1000) as g;

-- 3,000 orders (3 per customer) with one bazaar each.
create temporary table volume_orders on commit drop as
with numbered as (
  select c.id as customer_id, row_number() over (order by c.created_at, c.id) as n
  from public.customers c where c.full_name like 'Clienta Volumen %'
)
select customer_id, n, k from numbered, generate_series(1, 3) as k;

with inserted as (
  insert into public.orders (customer_id, description, expected_packages)
  select customer_id, 'Pedido de volumen ' || n || '-' || k, 1 + (n + k) % 3
  from volume_orders
  returning id, expected_packages
)
insert into public.order_bazaars (order_id, bazaar_id)
select i.id, (select b.id from public.bazaars b where b.name like 'Bazar Volumen %' order by random() limit 1)
from inserted i;

-- Payments: 85% confirmed (recorded by the collector), 10% pending, 5% without payment.
insert into public.payments (order_id, amount_cents, status, proof_path)
select o.id, 10000,
  (case when random() < 0.9 then 'confirmed' else 'pending' end)::public.payment_status,
  o.customer_id::text || '/volume-proof.jpg'
from public.orders o
where o.description like 'Pedido de volumen %' and random() < 0.95;

-- ~6,000 packages on orders with a confirmed payment (moves them to "receiving").
insert into public.packages (customer_id, order_id, bazaar_name, photo_path, note)
select o.customer_id, o.id, 'Bazar Volumen', o.customer_id::text || '/volume-' || gs || '.jpg', null
from public.orders o
cross join generate_series(1, 3) as gs
where o.description like 'Pedido de volumen %'
  and o.status = 'payment_confirmed'
  and gs <= o.expected_packages;

-- Close part of the history: complete, ship and deliver some orders.
update public.orders set status = 'complete'
where description like 'Pedido de volumen %' and status = 'receiving' and random() < 0.6;

insert into public.shipments (order_id, type, carrier, tracking_number, cost_cents)
select o.id, 'carrier', 'Estafeta', 'VOL' || o.folio, 15000
from public.orders o
where o.description like 'Pedido de volumen %' and o.status = 'complete' and random() < 0.7;

update public.orders set status = 'delivered'
where description like 'Pedido de volumen %' and status = 'shipped' and random() < 0.7;

commit;

select
  (select count(*) from public.customers) as customers,
  (select count(*) from public.orders) as orders,
  (select count(*) from public.payments) as payments,
  (select count(*) from public.packages) as packages,
  (select count(*) from public.bazaars where status = 'approved') as approved_bazaars;
