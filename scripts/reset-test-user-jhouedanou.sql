-- ============================================================================
-- Reset de test : jhouedanou@gmail.com → non abonné + code LAVEIYE-7JY5 actif
-- ----------------------------------------------------------------------------
-- À exécuter AVANT un test de bout en bout du flow subscribe + code promo.
-- NE PAS jouer en production sur un compte réel sans accord explicite.
-- ============================================================================

BEGIN;

-- 1) Remettre l'utilisateur en "non abonné" sans abonnement actif
-- plan conserve 'Discovery' (capitalisation imposée par users_plan_check :
-- IN ('Discovery','Basic','Pro')). C'est subscription_status='inactive' +
-- subscription_end_date dans le passé qui rend isActive=false côté client.
UPDATE public.users
SET
  plan                    = 'Discovery',
  subscription_status     = 'inactive',
  subscription_start_date = NULL,
  subscription_end_date   = '2020-01-01 00:00:00+00',
  pending_plan            = NULL,
  pending_plan_starts_at  = NULL,
  pending_duration_days   = NULL,
  pending_billing         = NULL,
  updated_at              = NOW()
WHERE id = '5895d6ce-c6d4-4401-a128-930582fae692';

-- 2) Remettre le code promo en "active" pour qu'il soit à nouveau utilisable
UPDATE public.keynote_registrations
SET
  promo_status              = 'active',
  promo_redeemed_at         = NULL,
  promo_redeemed_by_user_id = NULL,
  promo_redeemed_plan       = NULL,
  promo_redeemed_amount     = NULL
WHERE promo_code = 'LAVEIYE-7JY5';

-- 3) (Optionnel) Retirer les champs promo du dernier paiement pour repartir propre
UPDATE public.payments
SET metadata = (metadata - 'promo_code') - 'promo_bonus'
WHERE id = 'b7b5d780-e914-482c-9c12-6524c8eb6074';

COMMIT;

-- Vérification rapide
SELECT
  u.plan,
  u.subscription_status,
  u.subscription_end_date,
  u.pending_plan
FROM public.users u
WHERE u.id = '5895d6ce-c6d4-4401-a128-930582fae692';

SELECT
  kr.promo_code,
  kr.promo_status,
  kr.promo_redeemed_at,
  kr.promo_redeemed_by_user_id
FROM public.keynote_registrations kr
WHERE kr.promo_code = 'LAVEIYE-7JY5';
