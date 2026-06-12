-- =============================================================================
-- Fix : téléphone vide dans /admin/audience.
-- L'inscription écrit `users.phone_e164` (cf. 20260528_users_phone.sql) mais la
-- vue admin_users lisait uniquement `users.phone_number` (colonne séparée,
-- quasi toujours nulle). On coalesce les deux sources, e164 prioritaire.
-- Idempotent. Dépend de 08_20260607_user_activity_access.sql.
-- =============================================================================

create or replace view public.admin_users as
select
  u.id,
  u.id                       as user_id,
  u.name,
  u.email,
  coalesce(u.phone_e164, u.phone_number) as phone_number,
  p.country,
  u.created_at,
  u.last_login_at,
  u.plan                      as subscription_plan,
  u.subscription_status,
  u.access_type,
  u.user_status,
  u.status,
  u.is_beta_tester,
  u.last_activity_at,
  coalesce(u.last_activity_at, u.last_login_at) as last_activity_ref
from public.users u
left join public.profiles p on p.user_id = u.id;
