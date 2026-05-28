-- RPCs to read/revoke auth.sessions from server code without exposing the
-- `auth` schema through PostgREST. Both functions run as SECURITY DEFINER and
-- restrict access to the service_role.

create or replace function public.list_user_sessions(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  not_after timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip inet
)
language sql
security definer
set search_path = public, auth
as $$
  select s.id, s.user_id, s.created_at, s.updated_at, s.not_after,
         s.refreshed_at, s.user_agent, s.ip
  from auth.sessions s
  where s.user_id = p_user_id
    and (s.not_after is null or s.not_after > now())
  order by s.refreshed_at desc nulls last;
$$;

revoke all on function public.list_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.list_user_sessions(uuid) to service_role;

create or replace function public.revoke_user_session(p_session_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deleted int;
begin
  delete from auth.sessions
  where id = p_session_id and user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.revoke_user_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_session(uuid, uuid) to service_role;
