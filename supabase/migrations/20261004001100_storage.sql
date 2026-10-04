-- Storage buckets and policies (contracts/storage.md, research R7, R17, R18).
-- Private files are only ever served through short-lived signed URLs created with the
-- caller's session, so these policies decide who can read each file (constitution II).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('bazaar-photos', 'bazaar-photos', true, 1048576,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('bazaar-photo-submissions', 'bazaar-photo-submissions', false, 1048576,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('bazaar-documents', 'bazaar-documents', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('payment-proofs', 'payment-proofs', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('package-photos', 'package-photos', false, 1048576,
    array['image/jpeg'])
on conflict (id) do nothing;

-- bazaar-photos (public): only the collector publishes photos when approving a proposal.
create policy "bazaar-photos: collector inserts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bazaar-photos' and (select public.is_collector()));

create policy "bazaar-photos: collector reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'bazaar-photos' and (select public.is_collector()));

create policy "bazaar-photos: collector deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bazaar-photos' and (select public.is_collector()));

-- bazaar-photo-submissions (private): photos not yet authorized (FR-030).
create policy "photo-submissions: bazaar uploads to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bazaar-photo-submissions'
    and (storage.foldername(name))[1] = (select public.current_bazaar_id())::text
    and (select public.current_bazaar_status()) not in ('suspended', 'deleted')
  );

create policy "photo-submissions: bazaar or collector reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bazaar-photo-submissions'
    and (
      (storage.foldername(name))[1] = (select public.current_bazaar_id())::text
      or (select public.is_collector())
    )
  );

create policy "photo-submissions: bazaar deletes own unless pending, or collector"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bazaar-photo-submissions'
    and (
      (select public.is_collector())
      or (
        (storage.foldername(name))[1] = (select public.current_bazaar_id())::text
        and not exists (
          select 1 from public.bazaar_profile_proposals pr
          where pr.bazaar_id = (select public.current_bazaar_id())
            and pr.status = 'pending'
            and storage.objects.name = any (pr.photo_paths)
        )
      )
    )
  );

-- bazaar-documents (private): the bazaar uploads, only the collector reads (FR-026).
create policy "bazaar-documents: bazaar uploads to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bazaar-documents'
    and (storage.foldername(name))[1] = (select public.current_bazaar_id())::text
    and (select public.current_bazaar_status()) not in ('suspended', 'deleted')
  );

create policy "bazaar-documents: collector reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'bazaar-documents' and (select public.is_collector()));

-- Deleting an object also needs SELECT on it, and the bazaar must never read its documents
-- (FR-026, FR-034). So only the collector deletes; files a bazaar replaces are listed in
-- public.storage_trash and removed with her session when she reviews that bazaar (research R23).
create policy "bazaar-documents: collector deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bazaar-documents' and (select public.is_collector()));

-- payment-proofs (private): the customer uploads, only the collector reads (constitution II).
create policy "payment-proofs: customer uploads to own folder, or collector"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (
      (select public.is_collector())
      or (
        (storage.foldername(name))[1] = (select public.current_customer_id())::text
        and (select public.current_customer_is_active())
      )
    )
  );

create policy "payment-proofs: collector reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (select public.is_collector()));

create policy "payment-proofs: collector deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'payment-proofs' and (select public.is_collector()));

-- package-photos (private): the collector uploads; a customer reads photos of her packages.
create policy "package-photos: collector uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'package-photos' and (select public.is_collector()));

create policy "package-photos: collector or owner reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'package-photos'
    and (
      (select public.is_collector())
      or exists (
        select 1 from public.packages p
        where p.photo_path = storage.objects.name
          and p.customer_id = (select public.current_customer_id())
      )
    )
  );

create policy "package-photos: collector deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'package-photos' and (select public.is_collector()));
