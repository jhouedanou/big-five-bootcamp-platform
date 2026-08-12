-- =============================================================================
-- Études téléchargeables (landing /etudes/[slug]) + capture de leads
--
-- Tables : studies, study_leads
-- Bucket : studies (privé — le PDF ne doit jamais avoir d'URL publique devinable,
--          l'accès passe par un lien signé généré à la demande)
--
-- Autonome : aucune dépendance à une autre migration.
-- =============================================================================

-- Fonction utilitaire updated_at. Définie à l'identique dans #1, reprise ici
-- pour que cette migration puisse tourner seule sur une base où #1 n'a pas été
-- exécutée. `create or replace` : rejouer #1 ensuite ne casse rien.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.studies (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  subtitle    text,
  -- Chemin dans le bucket `studies` (ex. 'finance/tome-1-finance.pdf').
  -- Nullable : la landing et la capture de leads peuvent tourner avant que le
  -- PDF final soit fourni. Tant que c'est null, le lead est enregistré et
  -- l'email annonce un envoi à venir plutôt qu'un lien mort.
  file_path   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_studies_updated_at on public.studies;
create trigger trg_studies_updated_at
  before update on public.studies
  for each row execute function public.set_updated_at();

create table if not exists public.study_leads (
  id             uuid primary key default gen_random_uuid(),
  study_id       uuid not null references public.studies(id) on delete cascade,

  first_name     text not null,
  last_name      text not null,
  email          text not null,
  phone          text not null,
  company        text,
  job_title      text,

  -- Consentement RGPD : la case est obligatoire côté formulaire, on horodate
  -- pour pouvoir prouver quand elle a été cochée.
  consent        boolean not null default false,
  consented_at   timestamptz,

  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  referrer       text,

  -- Jeton du lien de téléchargement envoyé par email. Non devinable, propre au
  -- lead : permet de compter les téléchargements réels et de renvoyer le lien.
  download_token uuid not null default gen_random_uuid(),
  downloaded_at  timestamptz,
  download_count integer not null default 0,

  created_at     timestamptz not null default now(),

  -- Un email = un lead par étude. Une seconde soumission ne crée pas de doublon :
  -- l'API renvoie l'email de livraison au lieu d'une erreur sèche, sinon la
  -- personne qui a perdu son email ne peut plus jamais récupérer l'étude.
  unique (study_id, email)
);

create index if not exists study_leads_study_idx   on public.study_leads(study_id, created_at desc);
create index if not exists study_leads_token_idx   on public.study_leads(download_token);
create index if not exists study_leads_source_idx  on public.study_leads(utm_source);

-- Le tableau de bord admin agrège analytics_events par nom d'événement et par
-- période (visites, formulaires ouverts, téléchargements) — sans cet index, le
-- filtrage se fait en seq scan sur toute la table.
-- Conditionnel : analytics_events est créée par #1, qui n'a pas forcément tourné.
-- Son absence ne doit pas faire échouer la mise en place des études.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'analytics_events'
  ) then
    create index if not exists analytics_events_name_created_idx
      on public.analytics_events(event_name, created_at desc);
  else
    raise notice 'Table analytics_events absente : index de funnel non créé. Exécuter la migration 01 pour les KPI de /admin/etudes.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.studies     enable row level security;
alter table public.study_leads enable row level security;

-- Les métadonnées d'une étude active sont publiques (la landing est indexable).
drop policy if exists "studies_select_active" on public.studies;
create policy "studies_select_active" on public.studies
  for select using (is_active = true);

-- study_leads : AUCUNE policy pour anon/authenticated. Ni lecture ni écriture
-- directe — tout passe par les routes serveur en service_role (qui bypasse RLS).
-- Sans policy, la table est fermée par défaut une fois RLS activée : c'est
-- exactement ce qu'on veut pour des données personnelles.

revoke all on public.study_leads from anon, authenticated;
grant all on public.study_leads to service_role;
grant all on public.studies     to service_role;

-- -----------------------------------------------------------------------------
-- Bucket privé pour les fichiers d'étude
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('studies', 'studies', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Seed : Tome 1 — Finance
-- file_path reste null tant que le PDF final n'a pas été déposé dans le bucket.
-- Pour l'activer : uploader le fichier puis
--   update public.studies set file_path = 'finance/<nom-du-fichier>.pdf'
--   where slug = 'finance';
-- -----------------------------------------------------------------------------
insert into public.studies (slug, title, subtitle, is_active)
values (
  'finance',
  'Comment les marques en Afrique francophone communiquent ?',
  'Tome 1 : Finance',
  true
)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select slug, title, file_path from public.studies;        -- 1 ligne, file_path null
--   select count(*) from public.study_leads;                  -- 0, sans erreur
--   -- en tant qu'utilisateur connecté (pas service_role) :
--   select * from public.study_leads;                         -- doit ÉCHOUER / 0 ligne
-- -----------------------------------------------------------------------------
