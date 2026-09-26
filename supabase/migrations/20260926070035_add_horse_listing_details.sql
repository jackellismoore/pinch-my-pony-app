alter table public.horses
  add column if not exists gender text,
  add column if not exists disciplines text[] not null default '{}',
  add column if not exists rider_experience text;

alter table public.public_horses
  add column if not exists gender text,
  add column if not exists disciplines text[] not null default '{}',
  add column if not exists rider_experience text;
