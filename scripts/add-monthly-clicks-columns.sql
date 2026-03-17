-- Migration: Ajouter les colonnes pour le compteur de clics mensuel et l'usage mensuel
-- À exécuter dans le SQL Editor de Supabase

-- Compteur de clics mensuel (plan gratuit) - remplace le localStorage
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_click_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_click_reset TIMESTAMPTZ DEFAULT NOW();

-- Compteur d'usage mensuel (Pro/Agency) - campagnes explorées
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_campaigns_explored INTEGER DEFAULT 0;

-- Index pour la performance du cron de reset mensuel
CREATE INDEX IF NOT EXISTS idx_users_monthly_click_reset ON users(monthly_click_reset);
