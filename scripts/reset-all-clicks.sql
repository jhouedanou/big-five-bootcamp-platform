-- Reset des compteurs de consultations mensuelles pour TOUS les utilisateurs
-- Remet à zéro : monthly_click_count, monthly_campaigns_explored, monthly_click_reset

UPDATE users
SET
  monthly_click_count = 0,
  monthly_campaigns_explored = 0,
  monthly_click_reset = NOW()
WHERE monthly_click_count > 0 OR monthly_campaigns_explored > 0;
