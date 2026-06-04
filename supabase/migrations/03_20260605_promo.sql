-- =============================================================================
-- Mécanique promotionnelle Laveiye
-- - promo_campaigns : période + flags d'affichage (bannière/popup)
-- - promo_offers    : offres tarifaires (3 mois Basic 10k, 2 mois Pro 10k)
-- - user_popup_views: fréquence d'affichage du popup (1×/jour/utilisateur)
--
-- NB paiement : on NE crée PAS de tables payments/subscriptions parallèles.
-- L'activation passe par le flux existant (payments + webhook Chariow
-- /api/payment/chariow/pulse → activateUserSubscription, plan stocké sur users).
-- promo_offers.payment_product_id = product_id Chariow dédié (prix 10 000).
-- =============================================================================

create table if not exists public.promo_campaigns (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  start_date    timestamptz not null,
  end_date      timestamptz not null,
  is_active     boolean not null default true,
  show_in_banner boolean not null default true,
  show_in_popup  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.promo_offers (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references public.promo_campaigns(id) on delete cascade,
  name               text not null,
  plan_type          text not null,                 -- 'basic' | 'pro'
  price              integer not null,
  currency           text not null default 'XOF',
  duration_months    integer not null,
  is_active          boolean not null default true,
  payment_product_id text,                          -- product_id Chariow (prix promo)
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists promo_offers_campaign_idx on public.promo_offers(campaign_id);

create table if not exists public.user_popup_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  popup_type  text not null,
  last_seen_at timestamptz not null default now(),
  unique (user_id, popup_type)
);

create index if not exists user_popup_views_user_idx on public.user_popup_views(user_id);

-- updated_at sur promo_campaigns
drop trigger if exists trg_promo_campaigns_updated_at on public.promo_campaigns;
create trigger trg_promo_campaigns_updated_at
  before update on public.promo_campaigns
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Seed : campagne "Offre spéciale Laveiye" (01/07/2026 → 31/08/2026)
-- -----------------------------------------------------------------------------
insert into public.promo_campaigns (id, title, start_date, end_date, is_active, show_in_banner, show_in_popup)
values (
  '11111111-1111-1111-1111-111111111111',
  'Offre spéciale Laveiye',
  '2026-07-01T00:00:00+00:00',
  '2026-08-31T23:59:59+00:00',
  true, true, true
)
on conflict (id) do nothing;

insert into public.promo_offers (campaign_id, name, plan_type, price, currency, duration_months, sort_order, payment_product_id)
values
  ('11111111-1111-1111-1111-111111111111', 'Promo Basic', 'basic', 10000, 'XOF', 3, 10, 'prd_9ya1w161'),
  ('11111111-1111-1111-1111-111111111111', 'Promo Pro',   'pro',   10000, 'XOF', 2, 20, 'prd_51tfnkip')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.promo_campaigns  enable row level security;
alter table public.promo_offers     enable row level security;
alter table public.user_popup_views enable row level security;

-- Lecture publique des campagnes/offres actives (pour bannière/popup/checkout).
drop policy if exists "promo_campaigns_select_active" on public.promo_campaigns;
create policy "promo_campaigns_select_active" on public.promo_campaigns
  for select using (is_active = true);

drop policy if exists "promo_offers_select_active" on public.promo_offers;
create policy "promo_offers_select_active" on public.promo_offers
  for select using (is_active = true);

-- user_popup_views : chaque utilisateur gère ses propres lignes.
drop policy if exists "user_popup_views_select_own" on public.user_popup_views;
create policy "user_popup_views_select_own" on public.user_popup_views
  for select using (auth.uid() = user_id);

drop policy if exists "user_popup_views_insert_own" on public.user_popup_views;
create policy "user_popup_views_insert_own" on public.user_popup_views
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_popup_views_update_own" on public.user_popup_views;
create policy "user_popup_views_update_own" on public.user_popup_views
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
