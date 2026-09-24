-- PMP final RLS cleanup from the web audit.

drop policy if exists "availability_owner_write" on public.horse_unavailability;
create policy "availability_owner_insert" on public.horse_unavailability for insert to authenticated
with check ((select auth.uid())=owner_id and exists (select 1 from public.horses h where h.id=horse_unavailability.horse_id and h.owner_id=(select auth.uid())));
create policy "availability_owner_update" on public.horse_unavailability for update to authenticated
using ((select auth.uid())=owner_id and exists (select 1 from public.horses h where h.id=horse_unavailability.horse_id and h.owner_id=(select auth.uid())))
with check ((select auth.uid())=owner_id and exists (select 1 from public.horses h where h.id=horse_unavailability.horse_id and h.owner_id=(select auth.uid())));
create policy "availability_owner_delete" on public.horse_unavailability for delete to authenticated
using ((select auth.uid())=owner_id and exists (select 1 from public.horses h where h.id=horse_unavailability.horse_id and h.owner_id=(select auth.uid())));

drop policy if exists "horses_read_owner" on public.horses;
drop policy if exists "horses_read_public_active" on public.horses;
create policy "horses_read_authenticated" on public.horses for select to authenticated using (coalesce(is_active,true) or owner_id=(select auth.uid()));
create policy "horses_read_anon_active" on public.horses for select to anon using (coalesce(is_active,true));

drop policy if exists "identity_verifications_read_self" on public.identity_verifications;
drop policy if exists "read own identity_verifications" on public.identity_verifications;
create policy "identity_verifications_read_self" on public.identity_verifications for select to authenticated using ((select auth.uid())=user_id);

drop policy if exists "messages_insert_sender_participant" on public.messages;
drop policy if exists "verified users can send messages" on public.messages;
drop policy if exists "verified users can read messages" on public.messages;

drop policy if exists "profiles_read_self" on public.profiles;
drop policy if exists "profiles_select_shared_threads" on public.profiles;
create policy "profiles_read_allowed" on public.profiles for select to authenticated using (
  id=(select auth.uid()) or exists (
    select 1 from public.borrow_requests br join public.horses h on h.id=br.horse_id
    where (br.borrower_id=(select auth.uid()) and h.owner_id=profiles.id)
       or (h.owner_id=(select auth.uid()) and br.borrower_id=profiles.id)
  )
);
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_self_last_seen" on public.profiles;
drop policy if exists "profiles_write_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));

drop policy if exists "Borrower can insert review for approved request" on public.reviews;
drop policy if exists "reviews_borrower_insert" on public.reviews;
create policy "reviews_borrower_insert" on public.reviews for insert to authenticated with check (borrower_id=(select auth.uid()));
drop policy if exists "Users can update their own review" on public.reviews;
drop policy if exists "reviews_borrower_write" on public.reviews;
create policy "reviews_borrower_write" on public.reviews for update to authenticated
using (borrower_id=(select auth.uid())) with check (borrower_id=(select auth.uid()));

create index if not exists public_booked_ranges_horse_id_idx on public.public_booked_ranges(horse_id);
drop index if exists public.messages_request_created_idx;
drop index if exists public.reviews_one_per_request_borrower_idx;
