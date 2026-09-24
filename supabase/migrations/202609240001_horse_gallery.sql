alter table public.horses
  add column if not exists image_urls text[] not null default '{}'::text[];

alter table public.horses disable trigger validate_complete_horse_listing;

update public.horses
set image_urls = case
  when nullif(trim(coalesce(image_url, '')), '') is not null
    then array[image_url]
  else '{}'::text[]
end
where coalesce(array_length(image_urls, 1), 0) = 0;

alter table public.horses enable trigger validate_complete_horse_listing;

create or replace function public.validate_complete_horse_listing()
returns trigger
language plpgsql
as $$
begin
  if nullif(trim(coalesce(new.name, '')), '') is null then
    raise exception 'A horse name is required';
  end if;

  if nullif(trim(coalesce(new.location, '')), '') is null
     or new.lat is null
     or new.lng is null then
    raise exception 'A map location is required';
  end if;

  if nullif(trim(coalesce(new.breed, '')), '') is null then
    raise exception 'A horse breed is required';
  end if;

  if new.age is null then
    raise exception 'A horse age is required';
  end if;

  if new.height_hh is null then
    raise exception 'A horse height is required';
  end if;

  if nullif(trim(coalesce(new.temperament, '')), '') is null then
    raise exception 'A horse temperament is required';
  end if;

  if nullif(trim(coalesce(new.description, '')), '') is null then
    raise exception 'A horse description is required';
  end if;

  if nullif(trim(coalesce(new.image_url, '')), '') is null
     and coalesce(array_length(new.image_urls, 1), 0) = 0 then
    raise exception 'A horse photo is required';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_complete_horse_listing on public.horses;

create trigger validate_complete_horse_listing
before insert or update on public.horses
for each row
execute function public.validate_complete_horse_listing();