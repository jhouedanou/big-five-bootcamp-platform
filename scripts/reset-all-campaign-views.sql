-- Reset des compteurs de consultations de campagnes pour TOUS les utilisateurs.
--
-- Remet à zéro :
--   - daily_click_count        (quota quotidien — système actuel)
--   - daily_click_reset        (date du dernier reset quotidien)
--   - monthly_click_count      (legacy, conservé pour compat)
--   - monthly_campaigns_explored (compteur cumulé d'exploration)
--   - monthly_click_reset      (legacy)
--
-- Usage Supabase :
--   1. Ouvrir le SQL Editor du projet
--   2. Coller ce fichier et exécuter
--
-- Usage CLI (psql) :
--   psql "$DATABASE_URL" -f scripts/reset-all-campaign-views.sql

BEGIN;

UPDATE users
SET
  daily_click_count = 0,
  daily_click_reset = CURRENT_DATE,
  monthly_click_count = 0,
  monthly_campaigns_explored = 0,
  monthly_click_reset = NOW(),
  updated_at = NOW();

-- Vérification : lister les utilisateurs encore non-zéro (devrait être vide)
SELECT id, email, daily_click_count, monthly_campaigns_explored
FROM users
WHERE COALESCE(daily_click_count, 0) > 0
   OR COALESCE(monthly_campaigns_explored, 0) > 0;

COMMIT;
