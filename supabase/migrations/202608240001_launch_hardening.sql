-- Launch hardening and unified-account foundation.
-- Existing role values are retained temporarily for backwards compatibility,
-- but application access no longer depends on them.

alter table public.profiles
  add column if not exists account_model text not null default 'unified',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

update public.profiles set account_model = 'unified' where account_model is distinct from 'unified';

alter table public.profiles enable row level security;
alter table public.horses enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.horse_unavailability enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.identity_verifications enable row level security;
do $migration$
begin
  if to_regclass('public.stripe_events') is not null then
    alter table public.stripe_events enable row level security;
  end if;
end;
$migration$;

drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles_write_self" on public.profiles;
create policy "profiles_write_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- RLS limits which profile row a member can update, but it cannot protect
-- individual columns. Keep verification, membership, billing, and legacy
-- authorization fields writable only by service-role server code.
create or replace function public.protect_server_managed_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    raise exception 'Server-managed profile fields cannot be changed by clients';
  end if;
  return new;
end;
$$;

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
  verification_status,
  verified_at,
  verification_provider
on public.profiles
for each row
execute function public.protect_server_managed_profile_fields();

drop policy if exists "horses_read_authenticated" on public.horses;
create policy "horses_read_authenticated" on public.horses
  for select to authenticated using (true);
drop policy if exists "horses_insert_self" on public.horses;
create policy "horses_insert_self" on public.horses
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "horses_update_self" on public.horses;
create policy "horses_update_self" on public.horses
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "horses_delete_self" on public.horses;
create policy "horses_delete_self" on public.horses
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "requests_participant_read" on public.borrow_requests;
create policy "requests_participant_read" on public.borrow_requests
  for select to authenticated using (
    borrower_id = auth.uid() or exists (
      select 1 from public.horses h where h.id = horse_id and h.owner_id = auth.uid()
    )
  );
drop policy if exists "requests_borrower_insert" on public.borrow_requests;
create policy "requests_borrower_insert" on public.borrow_requests
  for insert to authenticated with check (borrower_id = auth.uid());
drop policy if exists "requests_participant_update" on public.borrow_requests;
create policy "requests_participant_update" on public.borrow_requests
  for update to authenticated using (
    borrower_id = auth.uid() or exists (
      select 1 from public.horses h where h.id = horse_id and h.owner_id = auth.uid()
    )
  );
drop policy if exists "requests_participant_delete" on public.borrow_requests;
create policy "requests_participant_delete" on public.borrow_requests
  for delete to authenticated using (
    borrower_id = auth.uid() or exists (
      select 1 from public.horses h where h.id = horse_id and h.owner_id = auth.uid()
    )
  );

drop policy if exists "messages_participant_read" on public.messages;
create policy "messages_participant_read" on public.messages
  for select to authenticated using (
    exists (
      select 1
      from public.borrow_requests br
      join public.horses h on h.id = br.horse_id
      where br.id = messages.request_id
        and (br.borrower_id = auth.uid() or h.owner_id = auth.uid())
    )
  );
drop policy if exists "messages_sender_insert" on public.messages;
create policy "messages_sender_insert" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1
      from public.borrow_requests br
      join public.horses h on h.id = br.horse_id
      where br.id = messages.request_id
        and (br.borrower_id = auth.uid() or h.owner_id = auth.uid())
    )
  );
drop policy if exists "messages_sender_update" on public.messages;
create policy "messages_sender_update" on public.messages
  for update to authenticated using (
    exists (
      select 1
      from public.borrow_requests br
      join public.horses h on h.id = br.horse_id
      where br.id = messages.request_id
        and (br.borrower_id = auth.uid() or h.owner_id = auth.uid())
    )
  ) with check (
    exists (
      select 1
      from public.borrow_requests br
      join public.horses h on h.id = br.horse_id
      where br.id = messages.request_id
        and (br.borrower_id = auth.uid() or h.owner_id = auth.uid())
    )
  );
drop policy if exists "messages_participant_delete" on public.messages;
create policy "messages_participant_delete" on public.messages
  for delete to authenticated using (
    exists (
      select 1
      from public.borrow_requests br
      join public.horses h on h.id = br.horse_id
      where br.id = messages.request_id
        and (br.borrower_id = auth.uid() or h.owner_id = auth.uid())
    )
  );

drop policy if exists "reviews_read_authenticated" on public.reviews;
create policy "reviews_read_authenticated" on public.reviews
  for select to authenticated using (true);
drop policy if exists "reviews_borrower_insert" on public.reviews;
create policy "reviews_borrower_insert" on public.reviews
  for insert to authenticated with check (borrower_id = auth.uid());
drop policy if exists "reviews_borrower_write" on public.reviews;
create policy "reviews_borrower_write" on public.reviews
  for update to authenticated using (borrower_id = auth.uid()) with check (borrower_id = auth.uid());

drop policy if exists "availability_read_authenticated" on public.horse_unavailability;
create policy "availability_read_authenticated" on public.horse_unavailability
  for select to authenticated using (true);
drop policy if exists "availability_owner_write" on public.horse_unavailability;
create policy "availability_owner_write" on public.horse_unavailability
  for all to authenticated using (
    exists (select 1 from public.horses h where h.id = horse_id and h.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.horses h where h.id = horse_id and h.owner_id = auth.uid())
  );

drop policy if exists "push_subscriptions_self" on public.push_subscriptions;
create policy "push_subscriptions_self" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notification_preferences_self" on public.notification_preferences;
create policy "notification_preferences_self" on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "identity_verifications_read_self" on public.identity_verifications;
create policy "identity_verifications_read_self" on public.identity_verifications
  for select to authenticated using (user_id = auth.uid());

-- stripe_events intentionally has no client policy. Service-role webhook access bypasses RLS.
