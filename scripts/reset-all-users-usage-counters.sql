-- ============================================================
-- Reset usage counters for all users
-- Resets consultations + searches/filters
-- Date: 2026-05-13
-- ============================================================
-- IMPORTANT : executer en transaction, verifier les SELECT avant COMMIT.
--
-- Champs remis a zero :
--   - daily_click_count          consultations mensuelles
--   - daily_click_reset          mois courant (YYYY-MM-01)
--   - daily_search_count         recherches + filtres mensuels
--   - daily_search_reset         mois courant (YYYY-MM-01)
--   - monthly_campaigns_explored activite mensuelle affichee
--   - monthly_click_count        ancien compteur, si encore utilise
--   - monthly_click_reset        ancien timestamp de reset, si encore utilise
--
-- Ne modifie PAS :
--   - plan
--   - subscription_status
--   - subscription_end_date

BEGIN;

-- 1) Apercu avant reset
SELECT
    COUNT(*) AS users_count,
    COALESCE(SUM(daily_click_count), 0) AS consultations_count,
    COALESCE(SUM(monthly_campaigns_explored), 0) AS campaigns_explored_count,
    COALESCE(SUM(COALESCE((daily_search_count ->> '_shared')::integer, 0)), 0) AS searches_filters_count
FROM public.users;

-- 2) Detail des utilisateurs qui ont de l'activite a remettre a zero
SELECT
    id,
    email,
    plan,
    subscription_status,
    daily_click_count,
    daily_click_reset,
    daily_search_count,
    daily_search_reset,
    monthly_campaigns_explored,
    monthly_click_count,
    monthly_click_reset
FROM public.users
WHERE COALESCE(daily_click_count, 0) <> 0
   OR COALESCE(monthly_campaigns_explored, 0) <> 0
   OR COALESCE((daily_search_count ->> '_shared')::integer, 0) <> 0
   OR daily_search_count IS DISTINCT FROM '{}'::jsonb
   OR monthly_click_count IS DISTINCT FROM 0
ORDER BY email;

-- 3) Reset global
WITH current_period AS (
    SELECT
        date_trunc('month', NOW() AT TIME ZONE 'UTC')::date AS month_start,
        NOW() AS reset_at
)
UPDATE public.users
SET
    daily_click_count = 0,
    daily_click_reset = current_period.month_start,
    daily_search_count = '{}'::jsonb,
    daily_search_reset = current_period.month_start,
    monthly_campaigns_explored = 0,
    monthly_click_count = 0,
    monthly_click_reset = current_period.reset_at,
    updated_at = current_period.reset_at
FROM current_period;

-- 4) Verification apres reset
SELECT
    COUNT(*) AS users_count,
    COALESCE(SUM(daily_click_count), 0) AS consultations_count,
    COALESCE(SUM(monthly_campaigns_explored), 0) AS campaigns_explored_count,
    COALESCE(SUM(COALESCE((daily_search_count ->> '_shared')::integer, 0)), 0) AS searches_filters_count
FROM public.users;

-- 5) Verification des resets dates
SELECT
    daily_click_reset,
    daily_search_reset,
    COUNT(*) AS users_count
FROM public.users
GROUP BY daily_click_reset, daily_search_reset
ORDER BY daily_click_reset, daily_search_reset;

-- Si tout est OK :
COMMIT;
-- Sinon :
-- ROLLBACK;
