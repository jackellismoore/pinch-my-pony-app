-- Pinch My Pony release security, public discovery, and borrowing entitlements.
-- Paid borrowing and Identity remain OFF by default. Turning them on is a
-- deliberate database setting change at release time; free testers are never
-- converted into paying customers automatically.

alter table public.profiles
  add column if not exists complimentary_access_until timestamptz,
  add column if not exists membership_current_period_end timestamptz,
  add column if not exists membership_cancel_at_period_end boolean not null default false;

drop trigger if exists protect_server_managed_profile_fields on public.profiles;
create trigger protect_server_managed_profile_fields
before update of
  role,
  account_model,
  beta_access,
  membership_tier,
  membership_status,
  stripe_customer_id,
  stripe_subscription_id,
  complimentary_access_until,
  membership_current_period_end,
  membership_cancel_at_period_end,
  verification_status,
  verified_at,
  verification_provider
on public.profiles
for each row
execute function public.protect_server_managed_profile_fields();

create table if not exists public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  borrowing_membership_required boolean not null default false,
  borrowing_identity_required boolean not null default false,
  launch_message text not null default 'Borrow free during our launch period. No card required.',
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;

-- A safe directory view. Billing identifiers and private account fields never
-- leave the owner row through public marketplace/profile lookups.
create or replace view public.public_profiles
with (security_invoker = false)
as
select
  id,
  display_name,
  full_name,
  avatar_url,
  stable_name,
  location,
  bio,
  last_seen_at,
  created_at,
  verification_status,
  verified_at,
  verification_provider
from public.profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

drop policy if exists "profiles_read_authenticated" on public.profiles;
drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self" on public.profiles
  for select to authenticated using (id = auth.uid());

-- Public discovery is intentionally read-only. Private request and message data
-- remains participant-only below.
drop policy if exists "horses_read_authenticated" on public.horses;
drop policy if exists "horses_read_public" on public.horses;
create policy "horses_read_public" on public.horses
  for select to anon, authenticated using (coalesce(is_active, true));

drop policy if exists "reviews_read_authenticated" on public.reviews;
drop policy if exists "reviews_read_public" on public.reviews;
create policy "reviews_read_public" on public.reviews
  for select to anon, authenticated using (true);

drop policy if exists "availability_read_authenticated" on public.horse_unavailability;
drop policy if exists "availability_read_public" on public.horse_unavailability;
create policy "availability_read_public" on public.horse_unavailability
  for select to anon, authenticated using (true);

create or replace view public.public_booked_ranges
with (security_invoker = false)
as
select id, horse_id, start_date, end_date
from public.borrow_requests
where status in ('approved', 'accepted')
  and start_date is not null
  and end_date is not null;

revoke all on public.public_booked_ranges from public;
grant select on public.public_booked_ranges to anon, authenticated;

create or replace function public.can_current_user_request()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when not coalesce((select borrowing_membership_required from public.platform_settings where id = 1), false)
      and not coalesce((select borrowing_identity_required from public.platform_settings where id = 1), false)
      then true
    else
      (
        not coalesce((select borrowing_membership_required from public.platform_settings where id = 1), false)
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and (
              lower(coalesce(p.membership_status, '')) in ('active', 'trialing')
              or p.complimentary_access_until > now()
            )
        )
      )
      and (
        not coalesce((select borrowing_identity_required from public.platform_settings where id = 1), false)
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.verification_status, '')) = 'verified'
        )
      )
  end;
$$;

revoke all on function public.can_current_user_request() from public;
grant execute on function public.can_current_user_request() to authenticated;

create or replace function public.validate_borrow_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_owner uuid;
begin
  if auth.uid() is null or new.borrower_id <> auth.uid() then
    raise exception 'Requests must be created by the signed-in member';
  end if;
  if lower(coalesce(new.status, '')) <> 'pending' then
    raise exception 'New requests must be pending';
  end if;
  if new.start_date is null or new.end_date is null or new.end_date < new.start_date then
    raise exception 'Choose a valid date range';
  end if;
  select owner_id into listing_owner from public.horses where id = new.horse_id and coalesce(is_active, true);
  if listing_owner is null then
    raise exception 'Listing is unavailable';
  end if;
  if listing_owner = auth.uid() then
    raise exception 'You cannot request your own listing';
  end if;
  if not public.can_current_user_request() then
    raise exception 'Active borrowing access is required';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_borrow_request_insert on public.borrow_requests;
create trigger validate_borrow_request_insert
before insert on public.borrow_requests
for each row execute function public.validate_borrow_request_insert();

drop policy if exists "requests_borrower_insert" on public.borrow_requests;
create policy "requests_borrower_insert" on public.borrow_requests
  for insert to authenticated with check (
    borrower_id = auth.uid()
    and lower(coalesce(status, '')) = 'pending'
    and public.can_current_user_request()
    and exists (
      select 1 from public.horses h
      where h.id = horse_id and h.owner_id <> auth.uid() and coalesce(h.is_active, true)
    )
  );

-- No participant can directly rewrite a request. Status transitions happen in
-- the owner-only RPC, where an advisory lock makes the availability check and
-- approval one atomic operation.
drop policy if exists "requests_participant_update" on public.borrow_requests;

create or replace function public.set_borrow_request_status(
  p_request_id uuid,
  p_status text
)
returns public.borrow_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.borrow_requests;
  listing_owner uuid;
begin
  if lower(p_status) not in ('approved', 'rejected') then
    raise exception 'Unsupported request status';
  end if;

  select br.*
  into target
  from public.borrow_requests br
  where br.id = p_request_id
  for update;

  if target.id is null then raise exception 'Request not found'; end if;
  select h.owner_id into listing_owner
  from public.horses h
  where h.id = target.horse_id;
  if listing_owner <> auth.uid() then raise exception 'Only the listing owner can decide this request'; end if;
  if lower(coalesce(target.status, '')) <> 'pending' then raise exception 'This request has already been decided'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target.horse_id::text, 0));

  if lower(p_status) = 'approved' and exists (
    select 1
    from public.borrow_requests other
    where other.horse_id = target.horse_id
      and other.id <> target.id
      and lower(coalesce(other.status, '')) in ('approved', 'accepted')
      and other.start_date <= target.end_date
      and other.end_date >= target.start_date
  ) then
    raise exception 'Those dates are no longer available';
  end if;

  update public.borrow_requests
  set status = lower(p_status)
  where id = target.id
  returning * into target;
  return target;
end;
$$;

revoke all on function public.set_borrow_request_status(uuid, text) from public;
grant execute on function public.set_borrow_request_status(uuid, text) to authenticated;

drop policy if exists "requests_participant_delete" on public.borrow_requests;
create policy "requests_pending_delete" on public.borrow_requests
  for delete to authenticated using (
    lower(coalesce(status, '')) in ('pending', 'rejected')
    and (
      borrower_id = auth.uid()
      or exists (select 1 from public.horses h where h.id = horse_id and h.owner_id = auth.uid())
    )
  );

-- A message recipient may acknowledge delivery/read state, but cannot alter the
-- sender, request, text, attachment, or any other content.
create or replace function public.protect_message_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.sender_id = auth.uid() then
    raise exception 'Senders cannot mark their own messages as read';
  end if;
  if (to_jsonb(new) - array['read_at','delivered_at','updated_at'])
     is distinct from
     (to_jsonb(old) - array['read_at','delivered_at','updated_at']) then
    raise exception 'Message content cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_message_content on public.messages;
create trigger protect_message_content
before update on public.messages
for each row execute function public.protect_message_content();

-- Enable RLS on every app-owned table that has previously appeared in the
-- client/server code. Service-role jobs continue to bypass these policies.
do $rls$
declare
  table_name text;
begin
  foreach table_name in array array[
    'message_thread_deletions',
    'message_threads',
    'push_notification_logs'
  ] loop
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relkind in ('r', 'p')
    ) then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end;
$rls$;

do $thread_security$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_thread_deletions' and c.relkind in ('r', 'p')
  ) then
    execute 'drop policy if exists "message_thread_deletions_self" on public.message_thread_deletions';
    execute 'create policy "message_thread_deletions_self" on public.message_thread_deletions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
  end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_threads' and c.relkind = 'v'
  ) then
    execute 'alter view public.message_threads set (security_invoker = true)';
  end if;
end;
$thread_security$;

comment on table public.platform_settings is
  'Release switches. Keep borrowing requirements false until the deliberate paid go-live.';

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_user_id uuid references public.profiles(id) on delete set null,
  horse_id uuid references public.horses(id) on delete set null,
  request_id uuid references public.borrow_requests(id) on delete set null,
  category text not null check (category in ('safety', 'listing', 'member', 'messages', 'fraud', 'other')),
  details text not null check (char_length(details) between 20 and 4000),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.safety_reports enable row level security;
drop policy if exists "safety_reports_insert_self" on public.safety_reports;
create policy "safety_reports_insert_self" on public.safety_reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'submitted');
drop policy if exists "safety_reports_read_self" on public.safety_reports;
create policy "safety_reports_read_self" on public.safety_reports
  for select to authenticated using (reporter_id = auth.uid());

create index if not exists safety_reports_status_created_idx
  on public.safety_reports(status, created_at desc);

create unique index if not exists reviews_one_per_request_borrower_idx
  on public.reviews(request_id, borrower_id);

create or replace function public.validate_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.borrow_requests br
    join public.horses h on h.id = br.horse_id
    where br.id = new.request_id
      and br.borrower_id = auth.uid()
      and new.borrower_id = br.borrower_id
      and new.horse_id = br.horse_id
      and new.owner_id = h.owner_id
      and lower(coalesce(br.status, '')) in ('approved', 'accepted')
      and br.end_date < current_date
  ) then
    raise exception 'Reviews are available after a completed approved booking';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_review_insert on public.reviews;
create trigger validate_review_insert
before insert on public.reviews
for each row execute function public.validate_review_insert();
