-- ============================================================================
-- Migration : pays et secteurs multiples pour brand_requests
--   countries TEXT[]  — multi-sélection (remplace l'ancien TEXT country)
--   sectors   TEXT[]  — multi-sélection (remplace l'ancien TEXT sector)
--
-- Les anciennes colonnes country / sector sont conservées pour compat ascendante
-- (les anciens enregistrements y sont rétro-remplis dans les tableaux).
-- Sûr à ré-exécuter (IF NOT EXISTS).
-- À lancer dans le SQL Editor de Supabase.
-- ============================================================================

ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sectors   TEXT[] DEFAULT '{}';

-- Backfill : copier les anciennes valeurs single-string dans les nouveaux tableaux
UPDATE public.brand_requests
  SET countries = ARRAY[country]
  WHERE country IS NOT NULL
    AND country <> ''
    AND (countries IS NULL OR countries = '{}');

UPDATE public.brand_requests
  SET sectors = ARRAY[sector]
  WHERE sector IS NOT NULL
    AND sector <> ''
    AND (sectors IS NULL OR sectors = '{}');

COMMENT ON COLUMN public.brand_requests.countries IS 'Pays/marchés concernés (multi-sélection, whitelistés depuis les campagnes publiées).';
COMMENT ON COLUMN public.brand_requests.sectors   IS 'Secteurs d''activité (multi-sélection, whitelistés depuis les campagnes publiées).';

-- Index GIN pour les recherches "ANY/contains" lors de l'agrégation dashboard
CREATE INDEX IF NOT EXISTS idx_brand_requests_countries_gin
  ON public.brand_requests USING GIN (countries);
CREATE INDEX IF NOT EXISTS idx_brand_requests_sectors_gin
  ON public.brand_requests USING GIN (sectors);
