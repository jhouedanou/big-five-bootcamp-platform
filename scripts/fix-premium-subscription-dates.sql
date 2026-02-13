-- ============================================================================
-- Script: fix-premium-subscription-dates.sql
-- Date: 2026-02-13
-- Description: Met à jour les dates de souscription pour tous les utilisateurs 
--              Premium qui n'ont pas de dates définies.
--              - subscription_start_date = aujourd'hui
--              - subscription_end_date = aujourd'hui + 30 jours
--              - subscription_status = 'active'
-- ============================================================================

-- 1. Vérifier d'abord les colonnes nécessaires
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Mettre à jour TOUS les utilisateurs Premium sans dates de souscription
UPDATE users
SET 
  subscription_status = 'active',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE plan = 'Premium'
  AND (subscription_start_date IS NULL OR subscription_end_date IS NULL);

-- 3. Mettre à jour les utilisateurs Premium avec des dates mais un status incorrect
UPDATE users
SET 
  subscription_status = 'active',
  updated_at = NOW()
WHERE plan = 'Premium'
  AND subscription_end_date > NOW()
  AND (subscription_status IS NULL OR subscription_status != 'active');

-- 4. Marquer les abonnements expirés
UPDATE users
SET 
  subscription_status = 'expired',
  updated_at = NOW()
WHERE plan = 'Premium'
  AND subscription_end_date IS NOT NULL
  AND subscription_end_date < NOW()
  AND subscription_status = 'active';

-- 5. Vérification : afficher le résultat
SELECT 
  id,
  email,
  name,
  plan,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  CASE 
    WHEN subscription_end_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (subscription_end_date - NOW()))::INT 
    ELSE NULL 
  END as jours_restants
FROM users
WHERE plan = 'Premium'
ORDER BY email;
