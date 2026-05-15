-- ============================================================
-- Audit du compte de test (rapport)
-- vlhzanpqmalrrfoslf@enotj.com
-- Date : 2026-05-15
--
-- Verifie l'etat actuel apres :
--   - rename plan 'Free' -> 'Discovery'
--   - correction Basic-vs-Pro
--   - allow expired access (bottom sheet au lieu de redirect)
-- ============================================================

-- 1) Profil utilisateur
SELECT id, email, plan, subscription_status, subscription_start_date,
       subscription_end_date, updated_at
FROM public.users
WHERE email = 'vlhzanpqmalrrfoslf@enotj.com';

-- 2) Historique des paiements lies a ce compte
SELECT id, ref_command, status, amount, final_amount,
       metadata->>'plan' AS meta_plan,
       metadata->>'plan_label' AS meta_plan_label,
       completed_at, created_at
FROM public.payments
WHERE user_email = 'vlhzanpqmalrrfoslf@enotj.com'
ORDER BY created_at DESC;

-- 3) Notifications recentes (verifier que les rappels d'expiration
--    ne sont pas dupliques)
SELECT id, type, title, metadata->>'subscription_end_date' AS sub_end,
       metadata->>'days_left' AS days_left, created_at
FROM public.notifications
WHERE user_id = (
        SELECT id FROM public.users
        WHERE email = 'vlhzanpqmalrrfoslf@enotj.com'
      )
  AND type IN ('subscription_expiring', 'subscription_expired')
ORDER BY created_at DESC;
