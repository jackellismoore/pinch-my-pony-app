-- Legacy tables are not used by the current application, but remain in the
-- exposed public schema. Keep them inaccessible through PostgREST.

do $migration$
begin
  if to_regclass('public.bookings') is not null then
    alter table public.bookings enable row level security;
  end if;
  if to_regclass('public.conversations') is not null then
    alter table public.conversations enable row level security;
  end if;
end;
$migration$;

-- No client policies are intentionally created: service-role maintenance can
-- still reach these legacy tables while anon/authenticated clients cannot.
