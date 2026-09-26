alter table public.horses
  add column if not exists gender text,
  add column if not exists disciplines text[] not null default '{}',
  add column if not exists rider_experience text;

alter table public.public_horses
  add column if not exists gender text,
  add column if not exists disciplines text[] not null default '{}',
  add column if not exists rider_experience text;

create or replace function private.sync_public_horse()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op='DELETE' then
    delete from public.public_horses where id=old.id;
    return old;
  end if;

  if coalesce(new.is_active,true) then
    insert into public.public_horses (
      id,owner_id,name,image_url,image_urls,photo_url,breed,age,height,height_hh,
      temperament,description,active,is_active,created_at,location,lat,lng,
      arrangement_type,help_needed,rider_expectations,gender,disciplines,rider_experience
    )
    values (
      new.id,new.owner_id,new.name,new.image_url,new.image_urls,new.photo_url,new.breed,
      new.age,new.height,new.height_hh,new.temperament,new.description,new.active,new.is_active,
      new.created_at,'Nearby area',
      case when new.lat is not null then round(new.lat::numeric,2)::double precision else null::double precision end,
      case when new.lng is not null then round(new.lng::numeric,2)::double precision else null::double precision end,
      new.arrangement_type,new.help_needed,new.rider_expectations,new.gender,new.disciplines,new.rider_experience
    )
    on conflict (id) do update set
      owner_id=excluded.owner_id,name=excluded.name,image_url=excluded.image_url,
      image_urls=excluded.image_urls,photo_url=excluded.photo_url,breed=excluded.breed,
      age=excluded.age,height=excluded.height,height_hh=excluded.height_hh,
      temperament=excluded.temperament,description=excluded.description,active=excluded.active,
      is_active=excluded.is_active,created_at=excluded.created_at,location=excluded.location,
      lat=excluded.lat,lng=excluded.lng,arrangement_type=excluded.arrangement_type,
      help_needed=excluded.help_needed,rider_expectations=excluded.rider_expectations,
      gender=excluded.gender,disciplines=excluded.disciplines,rider_experience=excluded.rider_experience;
  else
    delete from public.public_horses where id=new.id;
  end if;

  return new;
end;
$function$;
