-- Migration: Ajout des colonnes d'abonnement à la table users
-- Date: 2026-02-12
-- Description: Ajoute les colonnes nécessaires pour gérer les abonnements mensuels

-- Ajouter les colonnes d'abonnement si elles n'existent pas
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Créer un index pour améliorer les performances des requêtes d'abonnement
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON users(subscription_end_date);

-- Ajouter un commentaire sur les colonnes
COMMENT ON COLUMN users.subscription_status IS 'Statut de l''abonnement: inactive, active, expired, canceled';
COMMENT ON COLUMN users.subscription_start_date IS 'Date de début de l''abonnement actuel';
COMMENT ON COLUMN users.subscription_end_date IS 'Date de fin de l''abonnement actuel';

-- Créer une fonction pour vérifier les abonnements expirés
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET subscription_status = 'expired'
  WHERE subscription_status = 'active'
    AND subscription_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Créer un commentaire sur la fonction
COMMENT ON FUNCTION check_expired_subscriptions() IS 'Met à jour le statut des abonnements expirés. À exécuter régulièrement (cron job recommandé).';

-- Note: Vous pouvez créer un cron job pour exécuter cette fonction automatiquement
-- Par exemple, avec pg_cron (extension PostgreSQL):
-- SELECT cron.schedule('check-expired-subscriptions', '0 1 * * *', 'SELECT check_expired_subscriptions();');
