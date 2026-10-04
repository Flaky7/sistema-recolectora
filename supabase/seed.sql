-- Local development and test data. Every person, phone and address here is FICTITIOUS
-- (the repository is public; never put real customer or bazaar data in this file).
-- Password for every user: Prueba123!
-- Files referenced by storage paths do not exist in Storage; seeded photos and documents show as
-- missing. Tests upload their own files.

begin;

create function pg_temp.seed_user(user_email text, meta jsonb)
returns uuid
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', user_email,
    extensions.crypt('Prueba123!', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb, meta, now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_id, new_id::text,
    jsonb_build_object('sub', new_id::text, 'email', user_email, 'email_verified', true),
    'email', now(), now(), now()
  );
  return new_id;
end;
$$;

create function pg_temp.seed_customer_meta(full_name text, whatsapp text, kind text)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'role', 'customer', 'privacy_accepted', true, 'full_name', full_name,
    'whatsapp', whatsapp, 'shipping_address', 'Calle Ficticia 123, Col. Centro, Tijuana, B.C.',
    'type', kind
  );
$$;

-- Prepares a bazaar with proposal, the 4 documents and 3 references, ready to submit.
create function pg_temp.seed_bazaar(user_email text, bazaar_name text, brand_list text[])
returns uuid
language plpgsql
as $$
declare
  user_id uuid;
  b_id uuid;
begin
  user_id := pg_temp.seed_user(user_email, '{"role": "bazaar", "privacy_accepted": true}'::jsonb);
  select id into b_id from public.bazaars where profile_id = user_id;

  insert into public.bazaar_profile_proposals (bazaar_id, name, brands, link_url)
  values (b_id, bazaar_name, brand_list,
          'https://www.facebook.com/' || lower(replace(bazaar_name, ' ', '')));

  insert into public.bazaar_documents (bazaar_id, type, storage_path)
  select b_id, t, b_id::text || '/' || t::text || '-seed.jpg'
  from unnest(enum_range(null::public.bazaar_document_type)) as t;

  insert into public.bazaar_references (bazaar_id, position, full_name, phone)
  values (b_id, 1, 'Referencia Uno', '6640000001'),
         (b_id, 2, 'Referencia Dos', '6640000002'),
         (b_id, 3, 'Referencia Tres', '6640000003');
  return b_id;
end;
$$;

-- Publishes the pending proposal and approves the bazaar (what apply_bazaar_proposal does).
create function pg_temp.seed_approve(b_id uuid)
returns void
language plpgsql
as $$
declare
  pr public.bazaar_profile_proposals;
begin
  update public.bazaars set status = 'pending_review' where id = b_id;
  select * into pr from public.bazaar_profile_proposals where bazaar_id = b_id and status = 'pending';
  update public.bazaars
    set name = pr.name, brands = pr.brands, link_url = pr.link_url, status = 'approved'
    where id = b_id;
  update public.bazaar_profile_proposals
    set status = 'approved', reviewed_at = now()
    where id = pr.id;
end;
$$;

do $$
declare
  collector_id uuid;
  local_id uuid;
  outoftown_id uuid;
  noaccount_id uuid;
  b_draft uuid;
  b_pending uuid;
  b_approved_1 uuid;
  b_approved_2 uuid;
  b_rejected uuid;
  b_suspended uuid;
  b_change uuid;
  o_id uuid;
  p_id uuid;
begin
  -- Collector: signs up like a customer and is promoted (README, "Crear la cuenta de la recolectora").
  perform pg_temp.seed_user(
    'recolectora@test.local',
    pg_temp.seed_customer_meta('Recolectora de Prueba', '6649999999', 'local')
  );
  perform public.promote_to_collector('recolectora@test.local');
  select id into collector_id from public.profiles where email = 'recolectora@test.local';

  perform pg_temp.seed_user(
    'clienta.local@test.local',
    pg_temp.seed_customer_meta('Laura Local Ficticia', '6641111111', 'local')
  );
  perform pg_temp.seed_user(
    'clienta.foranea@test.local',
    pg_temp.seed_customer_meta('Fernanda Foránea Ficticia', '5512345678', 'out_of_town')
  );
  select c.id into local_id from public.customers c where c.whatsapp = '6641111111';
  select c.id into outoftown_id from public.customers c where c.whatsapp = '5512345678';

  -- Customer registered by the collector, without an account (FR-041).
  insert into public.customers (code, full_name, whatsapp, shipping_address, type, created_by)
  values ('SN2KQ', 'Rosa Sin Cuenta Ficticia', '6642222222',
          'Av. Imaginaria 456, Col. Libertad, Tijuana, B.C.', 'local', collector_id)
  returning id into noaccount_id;

  -- Bazaars in every state.
  b_draft := pg_temp.seed_bazaar('bazar.borrador@test.local', 'Bazar Borrador', array['Shein']);
  delete from public.bazaar_references where bazaar_id = b_draft and position = 3;

  b_pending := pg_temp.seed_bazaar('bazar.pendiente@test.local', 'Bazar Pendiente', array['Zara', 'Mango']);
  update public.bazaars set status = 'pending_review' where id = b_pending;

  b_approved_1 := pg_temp.seed_bazaar('bazar.aprobado@test.local', 'Bazar Ñandú', array['Zára', 'Bershka']);
  perform pg_temp.seed_approve(b_approved_1);
  -- A replacement document under review (FR-032).
  insert into public.bazaar_documents (bazaar_id, type, storage_path)
  values (b_approved_1, 'proof_of_address', b_approved_1::text || '/proof_of_address-new-seed.jpg');

  b_approved_2 := pg_temp.seed_bazaar('bazar.sinfotos@test.local', 'Bazar Sin Fotos', array['Nike', 'Adidas']);
  perform pg_temp.seed_approve(b_approved_2);

  b_rejected := pg_temp.seed_bazaar('bazar.rechazado@test.local', 'Bazar Rechazado', array['Forever 21']);
  update public.bazaars set status = 'pending_review' where id = b_rejected;
  update public.bazaars
    set status = 'rejected', status_reason = 'La credencial no es legible.'
    where id = b_rejected;

  b_suspended := pg_temp.seed_bazaar('bazar.suspendido@test.local', 'Bazar Suspendido', array['Gap']);
  perform pg_temp.seed_approve(b_suspended);
  update public.bazaars
    set status = 'suspended', status_reason = 'Fotos inapropiadas.'
    where id = b_suspended;

  b_change := pg_temp.seed_bazaar('bazar.cambio@test.local', 'Bazar Con Cambio', array['H&M']);
  perform pg_temp.seed_approve(b_change);
  insert into public.bazaar_profile_proposals (bazaar_id, name, brands, link_url, status, submitted_at)
  values (b_change, 'Bazar Con Cambio Nuevo', array['H&M', 'Pull&Bear'],
          'https://www.facebook.com/bazarconcambionuevo', 'pending', now());

  -- Orders in different stages.
  -- 1. Local customer, registered, waiting for the deposit proof.
  with o as (
    insert into public.orders (customer_id, description, expected_packages)
    values (local_id, 'Blusas y un pantalón', 2) returning id
  )
  insert into public.order_bazaars (order_id, bazaar_id) select id, b_approved_1 from o;

  -- 2. Local customer, proof uploaded, payment under review.
  with o as (
    insert into public.orders (customer_id, description, expected_packages)
    values (local_id, 'Tenis para niña', 1) returning id
  )
  insert into public.order_bazaars (order_id, bazaar_name) select id, 'Bazar de Facebook sin registro' from o
  returning order_id into o_id;
  insert into public.payments (order_id, proof_path)
  values (o_id, local_id::text || '/proof-seed.jpg');

  -- 3. Out-of-town customer, payment confirmed, 1 of 2 packages received.
  with o as (
    insert into public.orders (customer_id, description, expected_packages)
    values (outoftown_id, 'Vestidos de fiesta', 2) returning id
  )
  insert into public.order_bazaars (order_id, bazaar_id) select id, b_approved_2 from o
  returning order_id into o_id;
  insert into public.payments (order_id, proof_path)
  values (o_id, outoftown_id::text || '/proof-seed.jpg')
  returning id into p_id;
  update public.payments set status = 'confirmed' where id = p_id;
  insert into public.packages (customer_id, order_id, bazaar_id, photo_path, received_by)
  values (outoftown_id, o_id, b_approved_2, outoftown_id::text || '/package-seed-1.jpg', collector_id);

  -- 4. Local customer, payment confirmed, 2 of 2 packages received (ready to complete and ship).
  with o as (
    insert into public.orders (customer_id, description, expected_packages)
    values (local_id, 'Bolsa y cartera', 2) returning id
  )
  insert into public.order_bazaars (order_id, bazaar_id) select id, b_approved_1 from o
  returning order_id into o_id;
  insert into public.payments (order_id, amount_cents, status)
  values (o_id, 10000, 'confirmed');
  insert into public.packages (customer_id, order_id, bazaar_id, photo_path, received_by)
  values (local_id, o_id, b_approved_1, local_id::text || '/package-seed-2.jpg', collector_id),
         (local_id, o_id, b_approved_1, local_id::text || '/package-seed-3.jpg', collector_id);

  -- 5. Customer without account: order and payment recorded by the collector (FR-042, FR-043).
  with o as (
    insert into public.orders (customer_id, description, expected_packages, created_by)
    values (noaccount_id, 'Ropa de bebé', 1, collector_id) returning id
  )
  insert into public.order_bazaars (order_id, bazaar_name) select id, 'Bazar de una amiga' from o
  returning order_id into o_id;
  insert into public.payments (order_id, amount_cents, status, recorded_by)
  values (o_id, 10000, 'confirmed', collector_id);

  -- 6. A package without order and an unidentified one (FR-017).
  insert into public.packages (customer_id, bazaar_name, photo_path, note, received_by)
  values (local_id, 'Bazar Desconocido', local_id::text || '/package-seed-4.jpg', 'Llegó sin pedido', collector_id),
         (null, null, 'unidentified/package-seed-5.jpg', 'Etiqueta ilegible', collector_id);
end;
$$;

commit;
