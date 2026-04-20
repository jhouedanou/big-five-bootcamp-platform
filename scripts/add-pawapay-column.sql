-- Ajouter la colonne pawapay_payment_id a la table payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pawapay_payment_id TEXT;

-- Index pour les lookups par pawapay_payment_id (utilise par le callback)
CREATE INDEX IF NOT EXISTS idx_payments_pawapay_payment_id ON payments(pawapay_payment_id);

-- Migration depuis l'ancienne colonne moneroo_payment_id si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'moneroo_payment_id'
  ) THEN
    UPDATE payments SET pawapay_payment_id = moneroo_payment_id
      WHERE pawapay_payment_id IS NULL AND moneroo_payment_id IS NOT NULL;
    DROP INDEX IF EXISTS idx_payments_moneroo_payment_id;
    ALTER TABLE payments DROP COLUMN IF EXISTS moneroo_payment_id;
  END IF;
END $$;
