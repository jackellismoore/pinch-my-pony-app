-- PMP web/security audit hardening
-- Applied to the production Supabase project before this migration was committed.

create table if not exists public.public_profile_directory (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text,
  full_name text,
  avatar_url text,
  stable_name text,
  location text,
  bio text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  verification_status text,
  verified_at timestamptz,
  verification_provider text
);
alter table public.public_profile_directory enable row level security;
revoke all on public.public_profile_directory from public;
drop policy if exists "public_profile_directory_read" on public.public_profile_directory;
create policy "public_profile_directory_read" on public.public_profile_directory
  for select to anon, authenticated using (true);
grant select on public.public_profile_directory to anon, authenticated;

insert into public.public_profile_directory
select id,display_name,full_name,avatar_url,stable_name,location,bio,last_seen_at,created_at,verification_status,verified_at,verification_provider
from public.profiles
on conflict (id) do update set
  display_name=excluded.display_name, full_name=excluded.full_name, avatar_url=excluded.avatar_url,
  stable_name=excluded.stable_name, location=excluded.location, bio=excluded.bio,
  last_seen_at=excluded.last_seen_at, created_at=excluded.created_at,
  verification_status=excluded.verification_status, verified_at=excluded.verified_at,
  verification_provider=excluded.verification_provider;

create or replace function public.sync_public_profile_directory()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.public_profile_directory
  (id,display_name,full_name,avatar_url,stable_name,location,bio,last_seen_at,created_at,verification_status,verified_at,verification_provider)
  values
  (new.id,new.display_name,new.full_name,new.avatar_url,new.stable_name,new.location,new.bio,new.last_seen_at,new.created_at,new.verification_status,new.verified_at,new.verification_provider)
  on conflict (id) do update set
    display_name=excluded.display_name, full_name=excluded.full_name, avatar_url=excluded.avatar_url,
    stable_name=excluded.stable_name, location=excluded.location, bio=excluded.bio,
    last_seen_at=excluded.last_seen_at, created_at=excluded.created_at,
    verification_status=excluded.verification_status, verified_at=excluded.verified_at,
    verification_provider=excluded.verification_provider;
  return new;
end;
$$;
drop trigger if exists sync_public_profile_directory on public.profiles;
create trigger sync_public_profile_directory after insert or update on public.profiles
for each row execute function public.sync_public_profile_directory();

create or replace view public.public_profiles with (security_invoker = true)
as select * from public.public_profile_directory;
revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

drop policy if exists "profiles readable by anon" on public.profiles;
drop policy if exists "profiles readable by authenticated" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "users can view own profile" on public.profiles;

drop policy if exists "Authenticated can upload horse images" on storage.objects;
drop policy if exists "Authenticated can update horse images" on storage.objects;
drop policy if exists "Authenticated can delete horse images" on storage.objects;
drop policy if exists "auth can upload horses" on storage.objects;
drop policy if exists "auth can update horses" on storage.objects;
drop policy if exists "public can read horses" on storage.objects;
create policy "horse_images_insert_owner_folder" on storage.objects for insert to authenticated
with check (bucket_id='horses' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "horse_images_update_owner_folder" on storage.objects for update to authenticated
using (bucket_id='horses' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='horses' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "horse_images_delete_owner_folder" on storage.objects for delete to authenticated
using (bucket_id='horses' and (storage.foldername(name))[1]=(select auth.uid())::text);

create index if not exists bookings_request_id_idx on public.bookings(request_id);
create index if not exists borrow_requests_horse_id_idx on public.borrow_requests(horse_id);
create index if not exists conversations_request_id_idx on public.conversations(request_id);
create index if not exists horse_availability_horse_id_idx on public.horse_availability(horse_id);
create index if not exists horses_owner_id_idx on public.horses(owner_id);
create index if not exists message_thread_deletions_request_id_idx on public.message_thread_deletions(request_id);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists push_notification_logs_request_id_idx on public.push_notification_logs(request_id);
create index if not exists safety_reports_horse_id_idx on public.safety_reports(horse_id);
create index if not exists safety_reports_reporter_id_idx on public.safety_reports(reporter_id);
create index if not exists safety_reports_request_id_idx on public.safety_reports(request_id);
create index if not exists safety_reports_subject_user_id_idx on public.safety_reports(subject_user_id);

alter function public.enforce_horse_range_available() set search_path=public,pg_temp;
alter function public.is_horse_range_available(uuid,date,date,uuid) set search_path=public,pg_temp;
alter function public.is_verified_user() set search_path=public,pg_temp;
alter function public.prevent_message_edits_except_read_at() set search_path=public,pg_temp;
alter function public.ranges_overlap_inclusive(date,date,date,date) set search_path=public,pg_temp;
alter function public.set_notification_preferences_updated_at() set search_path=public,pg_temp;
alter function public.set_updated_at() set search_path=public,pg_temp;
alter function public.validate_complete_horse_listing() set search_path=public,pg_temp;

revoke execute on function public.can_current_user_request() from anon;
revoke execute on function public.claim_push_subscription(text,text,text) from anon;
revoke execute on function public.is_request_participant(uuid,uuid) from anon;
revoke execute on function public.set_borrow_request_status(uuid,text) from anon;
revoke execute on function public.enforce_borrow_request_availability() from anon,authenticated;
revoke execute on function public.handle_new_user() from anon,authenticated;
revoke execute on function public.prevent_message_edits() from anon,authenticated;
revoke execute on function public.set_review_denorm_fields() from anon,authenticated;
revoke execute on function public.validate_borrow_request_insert() from anon,authenticated;
revoke execute on function public.validate_review_insert() from anon,authenticated;

drop policy if exists "Reviews are readable by anyone" on public.reviews;
drop policy if exists "Authenticated can read unavailability for active horses" on public.horse_unavailability;
drop policy if exists "Owners can add unavailability for their horses" on public.horse_unavailability;
drop policy if exists "Owners can delete their own unavailability" on public.horse_unavailability;
drop policy if exists "Owners can read their own unavailability" on public.horse_unavailability;

drop policy if exists "messages_insert_participants" on public.messages;
drop policy if exists "messages_sender_insert" on public.messages;
drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_update_participants" on public.messages;
drop policy if exists "messages_sender_update" on public.messages;
drop policy if exists "messages_update_mark_read" on public.messages;
drop policy if exists "messages_participant_read" on public.messages;
drop policy if exists "messages_participant_insert" on public.messages;
drop policy if exists "messages_participant_update" on public.messages;
drop policy if exists "messages_participant_delete" on public.messages;
create policy "messages_participant_read" on public.messages for select to authenticated
using (is_request_participant(request_id,(select auth.uid())));
create policy "messages_participant_insert" on public.messages for insert to authenticated
with check (sender_id=(select auth.uid()) and is_request_participant(request_id,(select auth.uid())));
create policy "messages_participant_update" on public.messages for update to authenticated
using (is_request_participant(request_id,(select auth.uid())))
with check (is_request_participant(request_id,(select auth.uid())));
create policy "messages_participant_delete" on public.messages for delete to authenticated
using (is_request_participant(request_id,(select auth.uid())));

drop policy if exists "profiles_select_shared_threads" on public.profiles;
create policy "profiles_select_shared_threads" on public.profiles for select to authenticated using (
  id=(select auth.uid()) or exists (
    select 1 from public.borrow_requests br join public.horses h on h.id=br.horse_id
    where (br.borrower_id=(select auth.uid()) and h.owner_id=profiles.id)
       or (h.owner_id=(select auth.uid()) and br.borrower_id=profiles.id)
  )
);
