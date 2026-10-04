-- Collector reviews of bazaar documents and public-profile proposals (FR-029 to FR-034,
-- research R17, R18). Each function changes the rows in one transaction and returns the Storage
-- paths the Server Action must delete afterwards (Storage cannot be changed from SQL).

-- FR-033: the document under review becomes the current one; returns the replaced file's path.
create function public.approve_bazaar_document(document_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  doc public.bazaar_documents%rowtype;
  previous_path text;
begin
  if not public.is_collector() then
    raise exception 'Solo la recolectora puede revisar documentos.' using errcode = '42501';
  end if;

  select * into doc from public.bazaar_documents d
  where d.id = approve_bazaar_document.document_id
  for update;
  if not found or doc.status <> 'pending' then
    raise exception 'Este documento ya no está en revisión.' using errcode = 'P0001';
  end if;

  delete from public.bazaar_documents d
  where d.bazaar_id = doc.bazaar_id and d.type = doc.type and d.status = 'current'
  returning d.storage_path into previous_path;

  -- Only the last rejection per type is kept to show its reason; once a new one is approved,
  -- older rejections are no longer useful.
  delete from public.bazaar_documents d
  where d.bazaar_id = doc.bazaar_id and d.type = doc.type and d.status = 'rejected';

  update public.bazaar_documents d
    set status = 'current', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null
    where d.id = doc.id;

  return previous_path;
end;
$$;

-- FR-033: rejects the document under review, keeps the current one, returns the rejected path.
create function public.reject_bazaar_document(document_id uuid, reason text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  doc public.bazaar_documents%rowtype;
begin
  if not public.is_collector() then
    raise exception 'Solo la recolectora puede revisar documentos.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(reason, ''))) < 3 then
    raise exception 'Escribe el motivo del rechazo.' using errcode = 'P0001';
  end if;

  select * into doc from public.bazaar_documents d
  where d.id = reject_bazaar_document.document_id
  for update;
  if not found or doc.status <> 'pending' then
    raise exception 'Este documento ya no está en revisión.' using errcode = 'P0001';
  end if;

  delete from public.bazaar_documents d
  where d.bazaar_id = doc.bazaar_id and d.type = doc.type and d.status = 'rejected';

  update public.bazaar_documents d
    set status = 'rejected',
        storage_path = null,
        rejection_reason = btrim(reason),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where d.id = doc.id;

  return doc.storage_path;
end;
$$;

-- FR-029 to FR-031: publishes a pending proposal. public_paths are the proposal's photos as they
-- now exist in the public bucket (same paths, in order). Returns the public paths that were
-- replaced so the action deletes them.
create function public.apply_bazaar_proposal(proposal_id uuid, public_paths text[])
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  proposal public.bazaar_profile_proposals%rowtype;
  previous text[];
  paths constant text[] := coalesce(public_paths, '{}');
begin
  if not public.is_collector() then
    raise exception 'Solo la recolectora puede autorizar cambios.' using errcode = '42501';
  end if;

  select * into proposal from public.bazaar_profile_proposals p
  where p.id = apply_bazaar_proposal.proposal_id
  for update;
  if not found or proposal.status <> 'pending' then
    raise exception 'Esta propuesta ya no está en revisión.' using errcode = 'P0001';
  end if;
  if cardinality(paths) > 3 then
    raise exception 'Un bazar puede tener como máximo 3 fotos.' using errcode = 'P0001';
  end if;
  if not public.paths_have_prefix(paths, proposal.bazaar_id::text || '/') then
    raise exception 'Las fotos no pertenecen a este bazar.' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(ph.storage_path), '{}') into previous
  from public.bazaar_photos ph where ph.bazaar_id = proposal.bazaar_id;

  update public.bazaars b
    set name = proposal.name, brands = proposal.brands, link_url = proposal.link_url
    where b.id = proposal.bazaar_id;

  delete from public.bazaar_photos ph where ph.bazaar_id = proposal.bazaar_id;
  insert into public.bazaar_photos (bazaar_id, position, storage_path)
  select proposal.bazaar_id, ord::smallint, path
  from unnest(paths) with ordinality as t(path, ord);

  update public.bazaar_profile_proposals p
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null
    where p.id = proposal.id;

  return coalesce(
    (select array_agg(old_path) from unnest(previous) as old_path where not (old_path = any (paths))),
    '{}'
  );
end;
$$;

revoke all on function public.approve_bazaar_document(uuid) from public, anon;
revoke all on function public.reject_bazaar_document(uuid, text) from public, anon;
revoke all on function public.apply_bazaar_proposal(uuid, text[]) from public, anon;
grant execute on function public.approve_bazaar_document(uuid) to authenticated;
grant execute on function public.reject_bazaar_document(uuid, text) to authenticated;
grant execute on function public.apply_bazaar_proposal(uuid, text[]) to authenticated;
