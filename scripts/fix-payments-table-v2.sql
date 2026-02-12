-- Migration: Table payments (Version simplifiée sans session_id)
-- Date: 2026-02-12
-- Description: Crée ou met à jour la table payments pour les abonnements

-- Supprimer la contrainte de clé étrangère sur session_id si elle existe
ALTER TABLE IF EXISTS payments 
  DROP CONSTRAINT IF EXISTS payments_session_id_fkey;

-- Créer la table payments si elle n'existe pas
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(100),
  ref_command VARCHAR(100) NOT NULL,
  paytech_token VARCHAR(255),
  client_phone VARCHAR(50),
  completed_at TIMESTAMP WITH TIME ZONE,
  final_amount INTEGER,
  initial_amount INTEGER,
  promo_enabled BOOLEAN DEFAULT FALSE,
  promo_value_percent INTEGER DEFAULT 0,
  ipn_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les colonnes manquantes si elles n'existent pas déjà
DO $$ 
BEGIN
  -- user_email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='user_email') THEN
    ALTER TABLE payments ADD COLUMN user_email VARCHAR(255) NOT NULL;
  END IF;

  -- amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='amount') THEN
    ALTER TABLE payments ADD COLUMN amount INTEGER NOT NULL;
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='status') THEN
    ALTER TABLE payments ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
  END IF;

  -- payment_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='payment_method') THEN
    ALTER TABLE payments ADD COLUMN payment_method VARCHAR(100);
  END IF;

  -- ref_command
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='ref_command') THEN
    ALTER TABLE payments ADD COLUMN ref_command VARCHAR(100) NOT NULL;
  END IF;

  -- paytech_token
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='paytech_token') THEN
    ALTER TABLE payments ADD COLUMN paytech_token VARCHAR(255);
  END IF;

  -- client_phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='client_phone') THEN
    ALTER TABLE payments ADD COLUMN client_phone VARCHAR(50);
  END IF;

  -- completed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='completed_at') THEN
    ALTER TABLE payments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- final_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='final_amount') THEN
    ALTER TABLE payments ADD COLUMN final_amount INTEGER;
  END IF;

  -- initial_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='initial_amount') THEN
    ALTER TABLE payments ADD COLUMN initial_amount INTEGER;
  END IF;

  -- promo_enabled
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='promo_enabled') THEN
    ALTER TABLE payments ADD COLUMN promo_enabled BOOLEAN DEFAULT FALSE;
  END IF;

  -- promo_value_percent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='promo_value_percent') THEN
    ALTER TABLE payments ADD COLUMN promo_value_percent INTEGER DEFAULT 0;
  END IF;

  -- ipn_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='ipn_data') THEN
    ALTER TABLE payments ADD COLUMN ipn_data JSONB;
  END IF;

  -- metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='metadata') THEN
    ALTER TABLE payments ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='created_at') THEN
    ALTER TABLE payments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='updated_at') THEN
    ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Créer les index si ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_payments_user_email ON payments(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_ref_command ON payments(ref_command);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Rendre ref_command unique s'il ne l'est pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_ref_command_key'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_ref_command_key UNIQUE (ref_command);
  END IF;
END $$;

-- Commentaires
COMMENT ON TABLE payments IS 'Stocke tous les paiements (abonnements et bootcamps)';
COMMENT ON COLUMN payments.user_email IS 'Email de l''utilisateur qui effectue le paiement';
COMMENT ON COLUMN payments.amount IS 'Montant en XOF';
COMMENT ON COLUMN payments.status IS 'Statut: pending, completed, failed, canceled, refunded';
COMMENT ON COLUMN payments.payment_method IS 'Méthode: Orange Money, MTN, Moov, Wave, Carte Bancaire';
COMMENT ON COLUMN payments.ref_command IS 'Référence unique de la commande';
COMMENT ON COLUMN payments.paytech_token IS 'Token retourné par PayTech';
COMMENT ON COLUMN payments.metadata IS 'Données additionnelles JSON: type (subscription/bootcamp), userId, duration_days, etc.';

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Afficher un résumé
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM payments;
  RAISE NOTICE 'Table payments prête. Nombre de paiements existants: %', v_count;
END $$;
