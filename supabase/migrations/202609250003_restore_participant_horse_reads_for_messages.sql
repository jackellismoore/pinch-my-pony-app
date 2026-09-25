create schema if not exists private;

create or replace function private.can_current_user_view_horse(p_horse_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.borrow_requests br
    where br.horse_id = p_horse_id
      and br.borrower_id = (select auth.uid())
  );
$$;

revoke all on function private.can_current_user_view_horse(uuid) from public, anon;
grant execute on function private.can_current_user_view_horse(uuid) to authenticated;

drop policy if exists horses_read_participant on public.horses;
create policy horses_read_participant
on public.horses
for select
to authenticated
using ((select private.can_current_user_view_horse(id)));
