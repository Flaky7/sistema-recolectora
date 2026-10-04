-- Lists Storage files that no table references any more (T148, research R9). Run it by hand in
-- the Supabase SQL editor. It only LISTS: Supabase does not allow deleting Storage objects with
-- SQL, so delete them from the dashboard (Storage > bucket > select > Delete) or with the API.
--
-- Files newer than one day are skipped: they may belong to a form that is still being filled.

with referenced as (
  select 'bazaar-photos'::text as bucket_id, storage_path as name from public.bazaar_photos
  union all
  -- Photos of drafts and changes under review are still in use.
  select 'bazaar-photo-submissions', unnest(photo_paths)
  from public.bazaar_profile_proposals where status in ('draft', 'pending')
  union all
  select 'bazaar-documents', storage_path from public.bazaar_documents where storage_path is not null
  union all
  -- Replaced documents waiting for the collector's next review (research R23).
  select bucket_id, path from public.storage_trash
  union all
  select 'payment-proofs', proof_path from public.payments where proof_path is not null
  union all
  select 'package-photos', photo_path from public.packages
)
select o.bucket_id, o.name, o.created_at, (o.metadata ->> 'size')::bigint as bytes
from storage.objects o
left join referenced r on r.bucket_id = o.bucket_id and r.name = o.name
where r.name is null
  and o.created_at < now() - interval '1 day'
  and o.bucket_id in (
    'bazaar-photos', 'bazaar-photo-submissions', 'bazaar-documents', 'payment-proofs', 'package-photos'
  )
order by o.bucket_id, o.created_at;
