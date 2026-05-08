-- ============================================================================
-- Migration : pays et secteurs multiples pour brand_requests
--   countries TEXT[]  — remplace la colonne TEXT country (multi-sélection)
--   sectors   TEXT[]  — remplace la colonne TEXT sector  (multi-sélection)
--
-- Les anciennes colonnes country / sector sont conservées pour compat
-- (les anciens enregistrements y sont rétro-remplis dans les tableaux).
-- Sûr à ré-exécuter (IF NOT EXISTS / WHERE array vide).
-- À lancer dans le SQL Editor de Supabase.
-- ============================================================================

ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sectors   TEXT[] DEFAULT '{}';

-- Backfill : copier les anciennes valeurs dans les nouveaux tableaux
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

COMMENT ON COLUMN public.brand_requests.countries IS 'Pays ou marchés concernés (multi-sélection, tiré des campagnes publiées).';
COMMENT ON COLUMN public.brand_requests.sectors   IS 'Secteurs d''activité (multi-sélection, tiré des campagnes publiées).';
