-- ============================================================================
-- Ajout des colonnes de contexte (spec parcours utilisateur "Suivi de marques")
--   - country         : pays / marché concerné
--   - sector          : secteur d'activité
--   - objective       : objectif de la demande
--
-- Sûr à ré-exécuter (IF NOT EXISTS).
-- À lancer dans le SQL Editor de Supabase.
-- ============================================================================

ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS country   TEXT,
  ADD COLUMN IF NOT EXISTS sector    TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT;

COMMENT ON COLUMN public.brand_requests.country   IS 'Pays ou marché concerné (saisie libre).';
COMMENT ON COLUMN public.brand_requests.sector    IS 'Secteur d''activité de la marque.';
COMMENT ON COLUMN public.brand_requests.objective IS 'Objectif de la demande de suivi.';
