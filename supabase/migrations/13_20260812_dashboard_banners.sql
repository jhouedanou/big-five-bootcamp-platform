-- =============================================================================
-- Bannières du dashboard (admin-configurables)
--
-- Table : dashboard_banners
--
-- Sert d'abord à annoncer l'étude BIG FIVE × LAVEIYE et à router le trafic vers
-- la landing /etudes/finance avec les paramètres UTM. Volontairement séparée de
-- `promo_campaigns` : celle-ci porte des offres payantes (plan, prix, produit
-- Chariow) et n'a aucun CRUD admin — elle est seedée en SQL. Ici on veut
-- exactement l'inverse : du contenu éditorial modifiable sans déploiement.
--
-- Autonome : aucune dépendance à une autre migration.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dashboard_banners (
  id           uuid primary key default gen_random_uuid(),

  title        text not null,
  body         text,
  cta_label    text not null default 'En savoir plus',
  image_url    text,
  link_url     text not null,

  -- Paramètres de campagne ajoutés au lien au moment du clic. Modifiables sans
  -- déploiement : c'est l'exigence centrale du brief bannière.
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,

  -- Fenêtre d'affichage. null = pas de borne de ce côté.
  starts_at    timestamptz,
  ends_at      timestamptz,

  is_active    boolean not null default true,
  sort_order   integer not null default 0,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dashboard_banners_active_idx
  on public.dashboard_banners(is_active, sort_order, starts_at, ends_at);

drop trigger if exists trg_dashboard_banners_updated_at on public.dashboard_banners;
create trigger trg_dashboard_banners_updated_at
  before update on public.dashboard_banners
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.dashboard_banners enable row level security;

-- Lecture : utilisateurs connectés, bannières actives et dans leur fenêtre.
-- La date est évaluée en base, pas côté client : une bannière expirée ne peut
-- pas être ressuscitée en trafiquant l'horloge du navigateur.
drop policy if exists "dashboard_banners_select_live" on public.dashboard_banners;
create policy "dashboard_banners_select_live" on public.dashboard_banners
  for select to authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  );

-- Écriture réservée au serveur (routes /api/admin/banners en service_role).
revoke all on public.dashboard_banners from anon, authenticated;
grant select on public.dashboard_banners to authenticated;
grant all    on public.dashboard_banners to service_role;

-- -----------------------------------------------------------------------------
-- Seed : bannière de l'étude Tome 1 — Finance.
-- Inactive par défaut : l'équipe l'active depuis /admin/bannieres une fois le
-- visuel du graphiste en place et les dates de campagne arrêtées.
-- -----------------------------------------------------------------------------
insert into public.dashboard_banners (
  title, body, cta_label, link_url,
  utm_source, utm_medium, utm_campaign, utm_content,
  is_active, sort_order
)
select
  'L’étude Big Five sur le digital en Afrique francophone est disponible',
  'Téléchargez notre étude pour découvrir les tendances, les usages et les opportunités du digital en Afrique francophone.',
  'Télécharger l’étude',
  '/etudes/finance',
  'laveiye', 'banner', 'etude_big_five', 'banniere_telechargement',
  false, 0
where not exists (
  select 1 from public.dashboard_banners where utm_campaign = 'etude_big_five'
);

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select title, is_active, link_url from public.dashboard_banners;  -- 1 ligne, is_active false
--   -- en tant qu'utilisateur connecté (pas service_role) :
--   update public.dashboard_banners set is_active = true;             -- doit ÉCHOUER
-- -----------------------------------------------------------------------------
