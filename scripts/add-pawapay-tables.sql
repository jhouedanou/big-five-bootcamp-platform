-- Migration PawaPay — tables et colonnes nécessaires aux callbacks
-- À exécuter dans Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Colonnes additionnelles sur la table `payments` pour les callbacks PawaPay
-- ---------------------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_transaction_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_code text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_message text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS authorization_url text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Table `payouts` — envois d'argent vers les clients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid UNIQUE NOT NULL,          -- UUIDv4 généré côté merchant
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  amount numeric(14,2),
  currency text,
  country text,
  provider text,
  phone_number text,
  status text NOT NULL DEFAULT 'pending',
  provider_transaction_id text,
  failure_code text,
  failure_message text,
  callback_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payouts_payout_id ON payouts(payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);

-- ---------------------------------------------------------------------------
-- 3. Table `refunds` — remboursements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id uuid UNIQUE NOT NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  deposit_id text,                          -- PawaPay depositId d'origine
  amount numeric(14,2),
  currency text,
  country text,
  status text NOT NULL DEFAULT 'pending',
  provider_transaction_id text,
  failure_code text,
  failure_message text,
  callback_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_refunds_refund_id ON refunds(refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- ---------------------------------------------------------------------------
-- 4. Table `pawapay_orphan_callbacks` — callbacks reçus sans paiement associé
--    (utile pour debugging / réconciliation manuelle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pawapay_orphan_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('deposit', 'payout', 'refund')),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pawapay_orphan_kind
  ON pawapay_orphan_callbacks(kind);

-- ---------------------------------------------------------------------------
-- 5. RLS — les callbacks utilisent la service_role donc pas de politique user
-- ---------------------------------------------------------------------------
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pawapay_orphan_callbacks ENABLE ROW LEVEL SECURITY;

-- Un user peut voir ses propres payouts
DROP POLICY IF EXISTS "users_view_own_payouts" ON payouts;
CREATE POLICY "users_view_own_payouts" ON payouts
  FOR SELECT USING (auth.uid() = user_id);

-- Pas de policy publique sur refunds ni orphan_callbacks (accès admin uniquement)
