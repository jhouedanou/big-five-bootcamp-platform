-- =====================================================================
-- Migration : Normalisation des plans (avril 2026)
-- ---------------------------------------------------------------------
-- Nouvelle grille tarifaire officielle (3 plans uniquement) :
--   * Free    → affiché "Découverte" (pour les explorateurs)
--   * Basic   → pour les indépendants (4 900 XOF / mois)
--   * Pro     → pour les professionnels (9 900 XOF / mois)
--
-- Suppression définitive des plans suivants :
--   * Premium    (ancien nom de Pro)
--   * Agency     (jamais commercialisé)
--   * Enterprise (jamais commercialisé)
--
-- Règles de consolidation :
--   * Premium / Agency / Enterprise  →  Pro
--   * Toute autre valeur inconnue    →  Free
-- =====================================================================

BEGIN;

-- 1) Voir la distribution avant migration (log)
DO $$
DECLARE
  v_row RECORD;
BEGIN
  RAISE NOTICE '--- Distribution AVANT migration ---';
  FOR v_row IN
    SELECT COALESCE(plan, '(null)') AS plan, COUNT(*) AS n
    FROM users
    GROUP BY plan
    ORDER BY n DESC
  LOOP
    RAISE NOTICE '  % : %', v_row.plan, v_row.n;
  END LOOP;
END $$;

-- 2) Consolider les anciens plans payants vers Pro
UPDATE users
SET plan = 'Pro'
WHERE plan IN ('Premium', 'premium', 'Agency', 'agency', 'Enterprise', 'enterprise');

-- 3) Normaliser la casse (au cas où)
UPDATE users SET plan = 'Free'  WHERE LOWER(plan) = 'free';
UPDATE users SET plan = 'Basic' WHERE LOWER(plan) = 'basic';
UPDATE users SET plan = 'Pro'   WHERE LOWER(plan) = 'pro';

-- 4) Tout ce qui n'est pas dans (Free, Basic, Pro) repasse en Free
UPDATE users
SET plan = 'Free'
WHERE plan IS NULL OR plan NOT IN ('Free', 'Basic', 'Pro');

-- 5) Contrainte CHECK pour empêcher toute régression future
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('Free', 'Basic', 'Pro'));

-- 6) Distribution APRÈS migration (log)
DO $$
DECLARE
  v_row RECORD;
BEGIN
  RAISE NOTICE '--- Distribution APRÈS migration ---';
  FOR v_row IN
    SELECT plan, COUNT(*) AS n
    FROM users
    GROUP BY plan
    ORDER BY n DESC
  LOOP
    RAISE NOTICE '  % : %', v_row.plan, v_row.n;
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- Notes :
--   * L'identifiant technique reste "Free" en base ; seule l'UI affiche
--     "Découverte". Ceci évite les problèmes d'encodage (é) dans les URL,
--     les enums Zod et les comparaisons string à travers le code.
--   * Rollback : il n'y a pas de rollback utile, les données "Premium" ne
--     peuvent pas être restaurées distinctement de "Pro".
-- =====================================================================
