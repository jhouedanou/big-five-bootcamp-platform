-- ============================================================
-- Migration : renommer le plan 'Free' en 'Discovery' dans users
-- Date: 2026-05-15
-- Context: suppression du tier Free unsubscribed. Chaque utilisateur
-- doit choisir Discovery / Basic / Pro apres son inscription. La DB
-- ne doit plus contenir la valeur 'Free' (heritee du temps ou
-- 'Decouverte' etait stocke sous cette cle pour eviter l'encodage).
--
-- IMPORTANT : executer en transaction, verifier les SELECT avant COMMIT.
-- ============================================================

BEGIN;

-- 1) Apercu : combien de rows seront modifiees
SELECT plan, subscription_status, COUNT(*) AS nb
FROM public.users
WHERE plan = 'Free' OR plan = 'free'
GROUP BY plan, subscription_status
ORDER BY plan, subscription_status;

-- 2) Renommer toutes les occurrences 'Free' / 'free' -> 'Discovery'
UPDATE public.users
SET plan = 'Discovery',
    updated_at = NOW()
WHERE plan = 'Free' OR plan = 'free';

-- 3) Verifier : aucun row residuel avec plan='Free'
SELECT plan, COUNT(*) AS nb
FROM public.users
GROUP BY plan
ORDER BY plan;

-- 4) (Optionnel) Si une colonne a une DEFAULT 'Free', la mettre a jour.
--    Decommenter si pertinent dans votre schema.
-- ALTER TABLE public.users
--   ALTER COLUMN plan SET DEFAULT 'Discovery';

-- Si tout est OK :
COMMIT;
-- Sinon :
-- ROLLBACK;
