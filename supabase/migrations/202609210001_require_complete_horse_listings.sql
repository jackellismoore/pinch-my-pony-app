-- Require complete horse listings.
-- Price per day intentionally remains optional.

-- Existing incomplete listings cannot remain visible in the marketplace.
update public.horses
set active = false,
    is_active = false
where
  nullif(trim(coalesce(name, '')), '') is null
  or nullif(trim(coalesce(breed, '')), '') is null
  or age is null
  or height_hh is null
  or nullif(trim(coalesce(temperament, '')), '') is null
  or nullif(trim(coalesce(description, '')), '') is null
  or nullif(trim(coalesce(location, '')), '') is null
  or lat is null
  or lng is null
  or nullif(trim(coalesce(image_url, '')), '') is null;

create or replace function public.validate_complete_horse_listing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.name, '')), '') is null then
    raise exception 'Horse name is required';
  end if;

  if nullif(trim(coalesce(new.breed, '')), '') is null then
    raise exception 'Breed is required';
  end if;

  if new.age is null then
    raise exception 'Age is required';
  end if;

  if new.height_hh is null then
    raise exception 'Height is required';
  end if;

  if nullif(trim(coalesce(new.temperament, '')), '') is null then
    raise exception 'Temperament is required';
  end if;

  if nullif(trim(coalesce(new.description, '')), '') is null then
    raise exception 'Description is required';
  end if;

  if nullif(trim(coalesce(new.location, '')), '') is null then
    raise exception 'Location is required';
  end if;

  if new.lat is null or new.lng is null then
    raise exception 'A map location is required';
  end if;

  if nullif(trim(coalesce(new.image_url, '')), '') is null then
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
