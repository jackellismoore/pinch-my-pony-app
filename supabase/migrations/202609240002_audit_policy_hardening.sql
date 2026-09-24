-- PMP follow-up audit hardening: safe booked-range directory and policy consolidation.

revoke execute on function public.can_current_user_request() from public, anon;
grant execute on function public.can_current_user_request() to authenticated;
revoke execute on function public.claim_push_subscription(text,text,text) from public, anon;
grant execute on function public.claim_push_subscription(text,text,text) to authenticated;
revoke execute on function public.is_request_participant(uuid,uuid) from public, anon;
grant execute on function public.is_request_participant(uuid,uuid) to authenticated;
revoke execute on function public.set_borrow_request_status(uuid,text) from public, anon;
grant execute on function public.set_borrow_request_status(uuid,text) to authenticated;
revoke execute on function public.enforce_borrow_request_availability() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_message_edits() from public, anon, authenticated;
revoke execute on function public.set_review_denorm_fields() from public, anon, authenticated;
revoke execute on function public.sync_public_profile_directory() from public, anon, authenticated;
revoke execute on function public.validate_borrow_request_insert() from public, anon, authenticated;
revoke execute on function public.validate_review_insert() from public, anon, authenticated;

drop view if exists public.public_booked_ranges;
create table if not exists public.public_booked_ranges (
  id uuid primary key,
  horse_id uuid not null references public.horses(id) on delete cascade,
  start_date date not null,
  end_date date not null
);
alter table public.public_booked_ranges enable row level security;
revoke all on public.public_booked_ranges from public;
drop policy if exists "public_booked_ranges_read" on public.public_booked_ranges;
create policy "public_booked_ranges_read" on public.public_booked_ranges for select to anon, authenticated using (true);
grant select on public.public_booked_ranges to anon, authenticated;

insert into public.public_booked_ranges(id,horse_id,start_date,end_date)
select id,horse_id,start_date,end_date from public.borrow_requests
where status in ('approved','accepted') and start_date is not null and end_date is not null
on conflict (id) do update set horse_id=excluded.horse_id,start_date=excluded.start_date,end_date=excluded.end_date;

create or replace function public.sync_public_booked_range()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if tg_op='DELETE' then
    delete from public.public_booked_ranges where id=old.id;
    return old;
  end if;
  if lower(coalesce(new.status,'')) in ('approved','accepted') and new.start_date is not null and new.end_date is not null then
    insert into public.public_booked_ranges(id,horse_id,start_date,end_date)
    values(new.id,new.horse_id,new.start_date,new.end_date)
    on conflict (id) do update set horse_id=excluded.horse_id,start_date=excluded.start_date,end_date=excluded.end_date;
  else
    delete from public.public_booked_ranges where id=new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_public_booked_range on public.borrow_requests;
create trigger sync_public_booked_range after insert or update or delete on public.borrow_requests
for each row execute function public.sync_public_booked_range();
revoke execute on function public.sync_public_booked_range() from public, anon, authenticated;

drop policy if exists "borrow_requests_insert_borrower" on public.borrow_requests;
drop policy if exists "requests_borrower_insert" on public.borrow_requests;
drop policy if exists "verified users can create requests" on public.borrow_requests;
drop policy if exists "borrow_requests_select_borrower" on public.borrow_requests;
drop policy if exists "borrow_requests_select_owner" on public.borrow_requests;
drop policy if exists "requests_participant_read" on public.borrow_requests;
drop policy if exists "verified users can view requests" on public.borrow_requests;
drop policy if exists "owner can delete their horse requests" on public.borrow_requests;
drop policy if exists "requests_pending_delete" on public.borrow_requests;

create policy "borrow_requests_participant_read" on public.borrow_requests for select to authenticated using (
  borrower_id=(select auth.uid()) or exists (select 1 from public.horses h where h.id=borrow_requests.horse_id and h.owner_id=(select auth.uid()))
);
create policy "borrow_requests_borrower_insert" on public.borrow_requests for insert to authenticated with check (
  borrower_id=(select auth.uid()) and lower(coalesce(status,''))='pending'
  and public.can_current_user_request()
  and exists (select 1 from public.horses h where h.id=borrow_requests.horse_id and h.owner_id<>(select auth.uid()) and coalesce(h.is_active,true))
);
create policy "borrow_requests_delete_participant" on public.borrow_requests for delete to authenticated using (
  (lower(coalesce(status,'')) in ('pending','rejected')
    and (borrower_id=(select auth.uid()) or exists (select 1 from public.horses h where h.id=borrow_requests.horse_id and h.owner_id=(select auth.uid()))))
  or exists (select 1 from public.horses h where h.id=borrow_requests.horse_id and h.owner_id=(select auth.uid()))
);

drop policy if exists "Owner can manage availability" on public.horse_availability;
create policy "Owner can insert availability" on public.horse_availability for insert to authenticated
with check ((select auth.uid())=(select h.owner_id from public.horses h where h.id=horse_availability.horse_id));
create policy "Owner can update availability" on public.horse_availability for update to authenticated
using ((select auth.uid())=(select h.owner_id from public.horses h where h.id=horse_availability.horse_id))
with check ((select auth.uid())=(select h.owner_id from public.horses h where h.id=horse_availability.horse_id));
create policy "Owner can delete availability" on public.horse_availability for delete to authenticated
using ((select auth.uid())=(select h.owner_id from public.horses h where h.id=horse_availability.horse_id));

drop policy if exists "delete own deletions" on public.message_thread_deletions;
drop policy if exists "insert own deletions" on public.message_thread_deletions;
drop policy if exists "select own deletions" on public.message_thread_deletions;
drop policy if exists "update own deletions" on public.message_thread_deletions;
drop policy if exists "message_thread_deletions_self" on public.message_thread_deletions;
create policy "message_thread_deletions_self" on public.message_thread_deletions for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "push_subscriptions_delete_self" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_self" on public.push_subscriptions;
drop policy if exists "push_subscriptions_select_self" on public.push_subscriptions;
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self" on public.push_subscriptions;
create policy "push_subscriptions_self" on public.push_subscriptions for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Service role manages notification preferences" on public.notification_preferences;
drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
drop policy if exists "Users can view own notification preferences" on public.notification_preferences;
drop policy if exists "notification_preferences_self" on public.notification_preferences;
create policy "notification_preferences_self" on public.notification_preferences for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
