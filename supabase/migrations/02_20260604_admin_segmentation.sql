-- =============================================================================
-- Admin dashboard : segmentation utilisateurs + système de tags
-- - Colonnes users : phone_number, last_login_at, access_type, user_status
-- - Tables tags / user_tags (+ seed des tags recommandés)
-- - Vue admin_users (jointure users + profiles pour le pays)
-- - Index de performance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colonnes de segmentation sur users
-- -----------------------------------------------------------------------------
alter table public.users add column if not exists phone_number  text;
alter table public.users add column if not exists last_login_at timestamptz;
alter table public.users add column if not exists access_type   text;
alter table public.users add column if not exists user_status   text;

-- Backfill heuristique (ne touche pas les valeurs déjà saisies)
update public.users
set access_type = case
  when is_beta_tester is true then 'Bêta testeur'
  when subscription_status = 'subscribed' or plan in ('Discovery', 'Découverte', 'Basic', 'Pro')
    then 'Accès payant'
  else 'Non abonné'
end
where access_type is null;

update public.users
set user_status = case
  when subscription_status = 'subscribed' then 'Payant'
  when status = 'inactive' then 'Inactif'
  else 'Gratuit'
end
where user_status is null;

-- -----------------------------------------------------------------------------
-- 2. Tags
-- -----------------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  color      text not null default '#0F0F0F',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.user_tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  unique (user_id, tag_id)
);

-- -----------------------------------------------------------------------------
-- 3. Seed des tags recommandés (ré-exécutable)
-- -----------------------------------------------------------------------------
insert into public.tags (name, slug, color) values
  ('Bêta testeur',         'beta-testeur',        '#6366F1'),
  ('Accès gratuit manuel', 'acces-gratuit-manuel','#10B981'),
  ('Accès promo',          'acces-promo',         '#F59E0B'),
  ('Paiement échoué',      'paiement-echoue',     '#EF4444'),
  ('Compte dormant',       'compte-dormant',      '#9CA3AF'),
  ('Utilisateur actif',    'utilisateur-actif',   '#22C55E'),
  ('PQL chaud',            'pql-chaud',           '#F97316'),
  ('À appeler',            'a-appeler',           '#3B82F6'),
  ('À relancer WhatsApp',  'a-relancer-whatsapp', '#25D366'),
  ('À relancer email',     'a-relancer-email',    '#0EA5E9'),
  ('Agence',               'agence',              '#8B5CF6'),
  ('Entreprise',           'entreprise',          '#0F172A'),
  ('École',                'ecole',               '#14B8A6'),
  ('Étudiant',             'etudiant',            '#84CC16'),
  ('VIP',                  'vip',                 '#F2B33D'),
  ('Converti',             'converti',            '#16A34A')
on conflict (slug) do nothing;

-- Migration du flag is_beta_tester existant → tag "Bêta testeur"
insert into public.user_tags (user_id, tag_id)
select u.id, t.id
from public.users u
cross join (select id from public.tags where slug = 'beta-testeur') t
where u.is_beta_tester is true
on conflict (user_id, tag_id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Index de performance
-- -----------------------------------------------------------------------------
create index if not exists users_plan_idx          on public.users(plan);
create index if not exists users_access_type_idx    on public.users(access_type);
create index if not exists users_user_status_idx     on public.users(user_status);
create index if not exists users_created_at_idx       on public.users(created_at);
create index if not exists users_last_login_at_idx    on public.users(last_login_at);
create index if not exists profiles_country_idx        on public.profiles(country);
create index if not exists user_tags_user_id_idx        on public.user_tags(user_id);
create index if not exists user_tags_tag_id_idx          on public.user_tags(tag_id);
-- analytics_events.* déjà indexés dans 20260604_onboarding.sql

-- -----------------------------------------------------------------------------
-- 5. Vue admin_users : source unique pour le tableau admin (filtrable/paginable)
--    Le pays vient de profiles (onboarding). Accès via service role uniquement.
-- -----------------------------------------------------------------------------
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
  u.is_beta_tester
from public.users u
left join public.profiles p on p.user_id = u.id;

-- -----------------------------------------------------------------------------
-- 6. RLS — tables réservées à l'admin (service role bypass).
--    RLS activée sans policy publique : aucun accès anon/authenticated direct.
-- -----------------------------------------------------------------------------
alter table public.tags      enable row level security;
alter table public.user_tags enable row level security;
