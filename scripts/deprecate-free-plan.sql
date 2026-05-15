-- ============================================================================
-- Déprécation du plan "Free"
-- ----------------------------------------------------------------------------
-- Politique :
--   * Plus aucun accès gratuit. Trois plans payants : Découverte, Basic, Pro.
--   * Un compte verrouillé (= sans abonnement actif) a `plan = NULL` et
--     `subscription_status` ∈ ('none', 'expired', 'cancelled', 'past_due').
--   * `useRequireActiveSubscription` redirige tout compte verrouillé vers
--     /subscribe.
--
-- Exécuter ce script UNE FOIS en production (et en staging).
-- ============================================================================

BEGIN;

-- 0) Rendre la colonne `plan` nullable (un compte verrouillé n'a pas de plan).
ALTER TABLE public.users
  ALTER COLUMN plan DROP NOT NULL;

-- 1) Migrer tous les anciens utilisateurs "Free" vers l'état verrouillé.
--    On ne donne pas Découverte automatiquement : l'utilisateur doit
--    explicitement choisir et payer une formule.
UPDATE public.users
SET
  plan = NULL,
  subscription_status = CASE
    WHEN subscription_status IN ('active', 'expired', 'cancelled', 'past_due', 'none')
      THEN subscription_status
    ELSE 'none'
  END
WHERE LOWER(COALESCE(plan, '')) = 'free';

-- 2) S'assurer que les comptes sans plan ont bien un statut cohérent.
UPDATE public.users
SET subscription_status = 'none'
WHERE plan IS NULL
  AND (subscription_status IS NULL OR subscription_status = '' OR subscription_status = 'free');

-- 3) Renforcer la contrainte sur la colonne `plan`.
--    Seules les valeurs canoniques 'Discovery', 'Basic', 'Pro' (ou NULL) sont
--    valides. On drop la contrainte précédente si elle existe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_plan_check;
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IS NULL OR plan IN ('Discovery', 'Basic', 'Pro'));

-- 4) Valeur par défaut pour `subscription_status` lors de la création d'un
--    nouveau profil : 'none' (compte verrouillé tant que l'utilisateur n'a
--    pas payé).
ALTER TABLE public.users
  ALTER COLUMN subscription_status SET DEFAULT 'none';

COMMIT;

-- ============================================================================
-- Vérifications (à exécuter manuellement après le COMMIT)
-- ============================================================================
-- SELECT plan, subscription_status, COUNT(*)
-- FROM public.users
-- GROUP BY plan, subscription_status
-- ORDER BY plan NULLS FIRST, subscription_status;
--
-- SELECT COUNT(*) AS still_free
-- FROM public.users
-- WHERE LOWER(COALESCE(plan, '')) = 'free';
-- -- Doit retourner 0.
