-- =============================================================================
-- Correction modèle utilisateur : 4 notions distinctes.
-- - last_activity_at (statut d'activité calculé en app)
-- - access_type normalisé en CODES (paid|manual_free|promo|beta|trial|none)
-- - vue admin_users : ajoute last_activity_at + last_activity_ref
-- Idempotent. Dépend de 20260604_admin_segmentation.sql.
-- =============================================================================

-- 1. Colonne activité
alter table public.users add column if not exists last_activity_at timestamptz;

create index if not exists users_last_activity_at_idx on public.users(last_activity_at);

-- Seed : last_activity_at = last_login_at quand dispo (fallback temporaire).
update public.users
set last_activity_at = last_login_at
where last_activity_at is null and last_login_at is not null;

-- 2. Normalisation access_type : libellés FR (ancienne migration) → codes.
update public.users set access_type = 'paid'        where access_type = 'Accès payant';
update public.users set access_type = 'beta'        where access_type in ('Bêta testeur', 'Bêta');
update public.users set access_type = 'manual_free' where access_type = 'Accès attribué par l''équipe';
update public.users set access_type = 'promo'       where access_type = 'Accès promo';
update public.users set access_type = 'none'        where access_type = 'Non abonné';

-- Backfill des valeurs nulles / non conformes vers un code valide.
update public.users
set access_type = case
  when is_beta_tester is true then 'beta'
  when subscription_status in ('active', 'subscribed') or plan in ('Discovery', 'Basic', 'Pro') then 'paid'
  else 'none'
end
where access_type is null
   or access_type not in ('paid', 'manual_free', 'promo', 'beta', 'trial', 'none');

-- 3. Vue admin_users : on AJOUTE les colonnes d'activité en fin (CREATE OR REPLACE
--    n'autorise que l'ajout de colonnes en fin, pas la réorganisation).
create or replace view public.admin_users as
select
  u.id,
  u.id                       as user_id,
  u.name,
  u.email,
  u.phone_number,
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
