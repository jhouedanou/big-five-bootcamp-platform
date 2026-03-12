-- Migration: Ajouter les colonnes manquantes à la table payments
-- Date: 2026-03-12
-- Description: Ajoute les colonnes utilisées par le code mais absentes de la table
--              car fix-payments-table-v2.sql ne les incluait pas
--
-- Colonnes manquantes:
--   item_name       - Nom de l'article/abonnement (utilisé par subscribe, check, success page)
--   chariow_sale_id - ID de vente Chariow (utilisé par subscribe, webhook)
--   item_description- Description optionnelle de l'article
--   currency        - Devise (XOF par défaut)
--   webhook_data    - Données brutes du webhook Chariow (utilisé par webhook route)

-- Ajouter item_name (nom de l'article/abonnement)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);

-- Ajouter chariow_sale_id (ID de vente Chariow)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS chariow_sale_id VARCHAR(255);

-- Ajouter item_description (description optionnelle)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS item_description TEXT;

-- Ajouter currency si manquant
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'XOF';

-- Ajouter webhook_data (données brutes du webhook Chariow)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_data JSONB;

-- Index pour chariow_sale_id (utilisé dans les webhooks pour retrouver un paiement)
CREATE INDEX IF NOT EXISTS idx_payments_chariow_sale_id ON payments(chariow_sale_id);

-- Vérification
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM information_schema.columns 
  WHERE table_name = 'payments' 
    AND column_name IN ('item_name', 'chariow_sale_id', 'webhook_data', 'currency');
  RAISE NOTICE 'Migration terminée. Colonnes ajoutées/vérifiées: % sur 4 attendues', v_count;
END $$;
