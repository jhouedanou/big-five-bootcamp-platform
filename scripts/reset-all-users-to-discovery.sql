-- ============================================================
-- Reset all users to Discovery (free tier) plan
-- Excludes admin: cossi@bifiveabidjan.com
-- Date: 2026-05-15
-- ============================================================
-- IMPORTANT : exécuter en transaction, vérifier le SELECT avant COMMIT.

BEGIN;

-- 1) Aperçu — utilisateurs qui vont être affectés
SELECT id, email, plan, subscription_status, subscription_end_date
FROM public.users
WHERE LOWER(email) <> 'cossi@bifiveabidjan.com'
  AND (plan IS DISTINCT FROM 'Discovery'
       OR subscription_status IS DISTINCT FROM 'expired'
       OR subscription_end_date IS NOT NULL);

-- 2) Reset
UPDATE public.users
SET plan = 'Discovery',
    subscription_status = 'expired',
    subscription_end_date = NULL,
    updated_at = NOW()
WHERE LOWER(email) <> 'cossi@bifiveabidjan.com';

-- 3) Vérification — admin intact ?
SELECT id, email, plan, subscription_status, subscription_end_date
FROM public.users
WHERE LOWER(email) = 'cossi@bifiveabidjan.com';

-- 4) Vérification — répartition finale
SELECT plan, COUNT(*) AS nb
FROM public.users
GROUP BY plan
ORDER BY plan;

-- Si tout est OK :
COMMIT;
-- Sinon :
-- ROLLBACK;
