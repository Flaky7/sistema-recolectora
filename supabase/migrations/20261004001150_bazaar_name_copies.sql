-- Customers cannot read the bazaars table (data-model.md, access matrix), so the name of a
-- registered bazaar is copied into order_bazaars and packages when the row is written. The copy
-- also keeps order history readable after a bazaar changes its name or is deleted (FR-048).

create function public.copy_bazaar_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.bazaar_id is not null
    and (tg_op = 'INSERT' or new.bazaar_id is distinct from old.bazaar_id) then
    select coalesce(b.name, new.bazaar_name) into new.bazaar_name
    from public.bazaars b
    where b.id = new.bazaar_id;
  end if;
  return new;
end;
$$;

create trigger order_bazaars_copy_name
  before insert or update of bazaar_id on public.order_bazaars
  for each row execute function public.copy_bazaar_name();

create trigger packages_copy_name
  before insert or update of bazaar_id on public.packages
  for each row execute function public.copy_bazaar_name();
