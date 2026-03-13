-- Ajouter la colonne moneroo_payment_id a la table payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS moneroo_payment_id TEXT;

-- Index pour les lookups par moneroo_payment_id (utilise par le webhook)
CREATE INDEX IF NOT EXISTS idx_payments_moneroo_payment_id ON payments(moneroo_payment_id);
