-- ============================================================
-- Subscription audit + manual fix for test account
-- Date: 2026-05-15
-- Context: Basic-to-Pro mis-assignment bug
--   vlhzanpqmalrrfoslf@enotj.com paid Basic but was set to Pro.
--
-- IMPORTANT: run in a transaction. Verify each SELECT before COMMIT.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) AUDIT: payments tied to the test account
--    Verifies what plan was actually paid for and what metadata
--    arrived from the payment provider.
-- ============================================================
SELECT
    p.id,
    p.ref_command,
    p.user_email,
    p.status,
    p.amount,
    p.final_amount,
    p.payment_method,
    p.provider,
    p.metadata->>'type'  AS meta_type,
    p.metadata->>'plan'  AS meta_plan,
    p.metadata->>'plan_label' AS meta_plan_label,
    p.metadata->>'billing' AS meta_billing,
    p.created_at,
    p.completed_at
FROM public.payments p
WHERE p.user_email = 'vlhzanpqmalrrfoslf@enotj.com'
ORDER BY p.created_at DESC;

-- 2) Current state of the test user
SELECT id, email, plan, subscription_status, subscription_start_date,
       subscription_end_date, created_at, updated_at
FROM public.users
WHERE email = 'vlhzanpqmalrrfoslf@enotj.com';

-- ============================================================
-- 3) MANUAL FIX: force the test user to Basic
--    Only run if step 1 confirms the paid amount was the Basic
--    price (4900 XOF monthly / 49000 XOF annual) or the metadata
--    plan was "basic".
-- ============================================================
UPDATE public.users
SET
    plan = 'Basic',
    subscription_status = 'active',
    -- Keep existing end date if any; otherwise grant 30 days from now.
    subscription_end_date = COALESCE(
        subscription_end_date,
        (NOW() + INTERVAL '30 days')
    ),
    updated_at = NOW()
WHERE email = 'vlhzanpqmalrrfoslf@enotj.com';

-- Verify
SELECT id, email, plan, subscription_status, subscription_end_date
FROM public.users
WHERE email = 'vlhzanpqmalrrfoslf@enotj.com';

-- ============================================================
-- 4) GLOBAL AUDIT: detect other users wrongly upgraded to Pro
--    Find users whose plan = 'Pro' but most recent completed
--    subscription payment has metadata.plan = 'basic'.
--    These are likely casualties of the same bug.
-- ============================================================
WITH last_sub_payment AS (
    SELECT DISTINCT ON (user_email)
        user_email,
        metadata->>'plan' AS paid_plan,
        amount,
        completed_at
    FROM public.payments
    WHERE status = 'completed'
      AND metadata->>'type' = 'subscription'
    ORDER BY user_email, completed_at DESC
)
SELECT
    u.id,
    u.email,
    u.plan          AS current_plan,
    lsp.paid_plan   AS metadata_plan,
    lsp.amount      AS paid_amount,
    lsp.completed_at
FROM public.users u
JOIN last_sub_payment lsp ON lsp.user_email = u.email
WHERE LOWER(u.plan) = 'pro'
  AND LOWER(lsp.paid_plan) = 'basic'
ORDER BY lsp.completed_at DESC;

-- ============================================================
-- 5) If row 4 returns Basic-paying users marked as Pro, run:
--    UPDATE public.users u
--    SET plan = 'Basic', updated_at = NOW()
--    FROM last_sub_payment lsp
--    WHERE u.email = lsp.user_email
--      AND LOWER(u.plan) = 'pro'
--      AND LOWER(lsp.paid_plan) = 'basic';
--    (Inspect the output of step 4 first, then uncomment.)
-- ============================================================

-- If everything looks good:
COMMIT;
-- Otherwise:
-- ROLLBACK;
