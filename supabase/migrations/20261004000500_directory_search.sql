-- Public directory search (FR-035 to FR-037, research R6). Returns only public, published
-- columns of approved bazaars; anonymous visitors never read the bazaars table directly.

create function public.search_directory(q text default '')
returns table (
  id uuid,
  name text,
  brands text[],
  link_url text,
  photo_paths text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  term constant text := lower(extensions.unaccent(btrim(coalesce(q, ''))));
  -- Escape LIKE wildcards typed by the visitor.
  pattern constant text :=
    '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  return query
  select
    b.id,
    b.name,
    b.brands,
    b.link_url,
    coalesce(
      (select array_agg(p.storage_path order by p.position)
       from public.bazaar_photos p where p.bazaar_id = b.id),
      '{}'::text[]
    )
  from public.bazaars b
  where b.status = 'approved'
    and (term = '' or b.search_text like pattern)
  order by
    case when term = '' then 0 else extensions.similarity(b.search_text, term) end desc,
    b.name
  limit 200;
end;
$$;

revoke all on function public.search_directory(text) from public;
grant execute on function public.search_directory(text) to anon, authenticated;
