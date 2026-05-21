-- ============================================================================
-- Migration : statut explicite des codes promo keynote
-- ----------------------------------------------------------------------------
-- Ajoute les colonnes nécessaires pour :
--   * exposer un statut clair (active / used / expired) au lieu de devoir
--     déduire l'état uniquement depuis promo_redeemed_at ;
--   * tracer qui a consommé le code (user_id, plan, montant) pour l'audit
--     et l'export CSV admin ;
--   * accueillir un téléphone optionnel pour la synchro Mailchimp.
--
-- Idempotente : peut être rejouée sans risque.
-- ============================================================================

BEGIN;

ALTER TABLE public.keynote_registrations
  ADD COLUMN IF NOT EXISTS promo_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS promo_redeemed_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_redeemed_plan text,
  ADD COLUMN IF NOT EXISTS promo_redeemed_amount integer,
  ADD COLUMN IF NOT EXISTS phone text;

-- Contrainte de valeurs autorisées sur le statut.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'keynote_registrations_promo_status_chk'
  ) THEN
    ALTER TABLE public.keynote_registrations
      ADD CONSTRAINT keynote_registrations_promo_status_chk
      CHECK (promo_status IN ('active', 'used', 'expired'));
  END IF;
END$$;

-- Index sur le statut pour filtrer rapidement les codes encore actifs.
CREATE INDEX IF NOT EXISTS keynote_registrations_promo_status_idx
  ON public.keynote_registrations (promo_status);

-- ----------------------------------------------------------------------------
-- Backfill : toute ligne déjà marquée comme redeemed doit passer en 'used'.
-- ----------------------------------------------------------------------------
UPDATE public.keynote_registrations
SET promo_status = 'used'
WHERE promo_redeemed_at IS NOT NULL
  AND promo_status <> 'used';

COMMENT ON COLUMN public.keynote_registrations.promo_status IS
  'Statut du code promo : active (utilisable), used (déjà consommé), expired (invalidé par l''admin).';
COMMENT ON COLUMN public.keynote_registrations.promo_redeemed_by_user_id IS
  'Utilisateur ayant consommé le code (lien vers users.id, conservé même si le user est supprimé).';
COMMENT ON COLUMN public.keynote_registrations.promo_redeemed_plan IS
  'Plan choisi par l''utilisateur lors de l''utilisation du code (discovery/basic/pro).';
COMMENT ON COLUMN public.keynote_registrations.promo_redeemed_amount IS
  'Montant en FCFA effectivement payé lors de l''utilisation du code.';
COMMENT ON COLUMN public.keynote_registrations.phone IS
  'Téléphone optionnel collecté ou importé depuis Mailchimp.';

COMMIT;
