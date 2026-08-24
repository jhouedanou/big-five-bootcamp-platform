-- =============================================================================
-- Formulaire de collecte des études : pays et secteur d'activité
--
-- Table : study_leads (migration #12)
--
-- Le brief « Formulaire de collecte de données » (P0) demande d'enrichir les
-- informations récupérées au téléchargement d'une étude : pays, secteur
-- d'activité, et un numéro de téléphone toujours accompagné de son indicatif.
--
-- Le téléphone reste dans la colonne existante `phone`, mais le formulaire le
-- normalise désormais en E.164 (« +2250700000000 ») : les numéros collectés
-- jusqu'ici, saisis librement, restent lisibles tels quels.
--
-- Colonnes optionnelles : les leads déjà enregistrés n'ont pas ces valeurs et
-- ne doivent pas devenir invalides.
--
-- Autonome : ne dépend que de l'existence de la table #12.
-- =============================================================================

alter table public.study_leads
  add column if not exists country      text,
  add column if not exists country_code text,
  add column if not exists sector       text;

comment on column public.study_leads.country is
  'Nom français du pays déclaré (ex. « Côte d''Ivoire »).';
comment on column public.study_leads.country_code is
  'ISO 3166-1 alpha-2 du pays déclaré (ex. « CI »). Sert aussi d''indicatif téléphonique.';
comment on column public.study_leads.sector is
  'Secteur d''activité déclaré, aligné sur la table public.sectors.';

-- Filtre le plus probable des exports marketing : pays puis secteur.
create index if not exists study_leads_country_idx on public.study_leads (country_code);
create index if not exists study_leads_sector_idx  on public.study_leads (sector);

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select email, country, country_code, sector, phone from public.study_leads limit 5;
-- -----------------------------------------------------------------------------
