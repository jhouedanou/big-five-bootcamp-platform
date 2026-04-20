-- ============================================================================
-- Migration : quotas quotidiens (consultations + recherches par filtre)
-- ============================================================================
-- Specs :
--   Decouverte  : 3 clics / jour, 3 recherches par filtre / jour
--   Basic       : consultations illimitees, 15 recherches par filtre / jour
--   Pro         : consultations illimitees, recherches illimitees
--
-- Colonnes :
--   daily_click_count   : compteur de consultations du jour
--   daily_click_reset   : date du dernier reset (DATE)
--   daily_search_count  : JSONB { "Secteur": 2, "Pays": 1, ... }
--   daily_search_reset  : date du dernier reset (DATE)
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_click_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_click_reset DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_search_count JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_search_reset DATE NOT NULL DEFAULT CURRENT_DATE;

-- Index pour les cron de reset
CREATE INDEX IF NOT EXISTS idx_users_daily_click_reset ON users(daily_click_reset);
CREATE INDEX IF NOT EXISTS idx_users_daily_search_reset ON users(daily_search_reset);

-- ============================================================================
-- (Optionnel) Vue pour diagnostiquer les quotas
-- ============================================================================
CREATE OR REPLACE VIEW v_user_daily_quotas AS
SELECT
  id,
  email,
  plan,
  subscription_status,
  daily_click_count,
  daily_click_reset,
  daily_search_count,
  daily_search_reset,
  CASE
    WHEN plan ILIKE 'pro' AND subscription_status = 'active' THEN 'unlimited'
    WHEN plan ILIKE 'basic' AND subscription_status = 'active' THEN '15 / filter / day'
    ELSE '3 / filter / day'
  END AS search_quota_label,
  CASE
    WHEN plan ILIKE 'pro' AND subscription_status = 'active' THEN 'unlimited'
    WHEN plan ILIKE 'basic' AND subscription_status = 'active' THEN 'unlimited'
    ELSE '3 / day'
  END AS click_quota_label
FROM users;
