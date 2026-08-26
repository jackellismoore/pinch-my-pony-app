-- Prevent notifications following a device from one member account to another.

delete from public.push_subscriptions older
using public.push_subscriptions newer
where older.endpoint = newer.endpoint
  and older.ctid < newer.ctid;

create unique index if not exists push_subscriptions_endpoint_unique
  on public.push_subscriptions (endpoint);

create or replace function public.claim_push_subscription(
  p_endpoint text,
  p_p256dh text default '',
  p_auth text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if nullif(trim(p_endpoint), '') is null or length(p_endpoint) > 4096 then
    raise exception 'Invalid notification endpoint';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, coalesce(p_p256dh, ''), coalesce(p_auth, ''));
end;
$$;

revoke all on function public.claim_push_subscription(text, text, text) from public;
grant execute on function public.claim_push_subscription(text, text, text) to authenticated;
