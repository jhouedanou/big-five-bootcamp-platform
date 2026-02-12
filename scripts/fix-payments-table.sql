-- Migration: Table payments pour les abonnements
-- Date: 2026-02-12
-- Description: Crée ou met à jour la table payments avec tous les champs nécessaires

-- Créer la table payments si elle n'existe pas
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(100),
  ref_command VARCHAR(100) UNIQUE NOT NULL,
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
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ref_command VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paytech_token VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS final_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS initial_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promo_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS promo_value_percent INTEGER DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ipn_data JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_payments_user_email ON payments(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_ref_command ON payments(ref_command);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);

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
COMMENT ON COLUMN payments.metadata IS 'Données additionnelles: type (subscription/bootcamp), userId, etc.';
COMMENT ON COLUMN payments.status IS 'pending, completed, failed, canceled, refunded';
