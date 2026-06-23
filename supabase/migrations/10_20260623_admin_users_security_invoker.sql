-- =============================================================================
-- Sécurité : la vue public.admin_users était SECURITY DEFINER (comportement par
-- défaut des vues Postgres), ce qui exécute la vue avec les droits du créateur
-- et contourne la RLS de l'appelant. Le linter Supabase le signale.
--
-- On la recrée en `security_invoker = on` : la vue applique désormais les droits
-- et la RLS du rôle qui interroge. Sans risque ici — la vue n'est lue que par
-- les routes /api/admin/* via la clé service_role (qui bypasse la RLS), l'accès
-- admin restant gardé au niveau applicatif par checkAdmin().
--
-- Définition identique à 09_20260612_admin_users_phone.sql. Idempotent.
-- Requiert Postgres 15+.
-- =============================================================================

create or replace view public.admin_users
with (security_invoker = on) as
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
