create schema if not exists private;

create or replace function private.get_message_threads()
returns table (
  request_id uuid,
  horse_name text,
  other_display_name text,
  unread_count integer,
  last_message text,
  last_message_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  with base as (
    select
      br.id as request_id,
      br.borrower_id,
      h.owner_id,
      h.name as horse_name,
      pb.display_name as borrower_display_name,
      pb.full_name as borrower_full_name,
      po.display_name as owner_display_name,
      po.full_name as owner_full_name
    from public.borrow_requests br
    join public.horses h on h.id = br.horse_id
    left join public.profiles pb on pb.id = br.borrower_id
    left join public.profiles po on po.id = h.owner_id
  ),
  last_msg as (
    select distinct on (m.request_id)
      m.request_id,
      m.content as last_message,
      m.created_at as last_message_at
    from public.messages m
    order by m.request_id, m.created_at desc, m.id desc
  ),
  unread as (
    select
      m.request_id,
      count(*)::integer as unread_count
    from public.messages m
    where m.read_at is null
      and m.sender_id <> (select auth.uid())
    group by m.request_id
  ),
  deleted as (
    select d.request_id, d.deleted_at
    from public.message_thread_deletions d
    where d.user_id = (select auth.uid())
  )
  select
    b.request_id,
    b.horse_name,
    case
      when (select auth.uid()) = b.owner_id then
        coalesce(nullif(trim(b.borrower_display_name), ''), nullif(trim(b.borrower_full_name), ''), 'User')
      else
        coalesce(nullif(trim(b.owner_display_name), ''), nullif(trim(b.owner_full_name), ''), 'User')
    end as other_display_name,
    coalesce(u.unread_count, 0) as unread_count,
    lm.last_message,
    lm.last_message_at
  from base b
  left join last_msg lm on lm.request_id = b.request_id
  left join unread u on u.request_id = b.request_id
  left join deleted d on d.request_id = b.request_id
  where (select auth.uid()) is not null
    and ((select auth.uid()) = b.owner_id or (select auth.uid()) = b.borrower_id)
    and (
      d.deleted_at is null
      or lm.last_message_at is null
      or lm.last_message_at > d.deleted_at
    )
  order by lm.last_message_at desc nulls last;
$function$;

revoke all on function private.get_message_threads() from public, anon, authenticated;
grant execute on function private.get_message_threads() to authenticated;

drop view if exists public.message_threads;
create view public.message_threads
with (security_invoker = true)
as
select * from private.get_message_threads();

revoke all on public.message_threads from public, anon;
grant select on public.message_threads to authenticated;
