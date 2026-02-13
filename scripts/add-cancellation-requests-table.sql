-- Table pour enregistrer les demandes d'annulation d'abonnement
-- Les utilisateurs ne peuvent pas annuler directement leur abonnement,
-- ils créent une demande que l'admin traitera manuellement.

CREATE TABLE IF NOT EXISTS subscription_cancellation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  current_plan TEXT DEFAULT 'Premium',
  subscription_end_date TIMESTAMPTZ,
  reason TEXT DEFAULT 'Demande d''annulation par l''utilisateur',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherches admin
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON subscription_cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_user ON subscription_cancellation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_created ON subscription_cancellation_requests(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_cancellation_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cancellation_request_updated_at ON subscription_cancellation_requests;
CREATE TRIGGER set_cancellation_request_updated_at
  BEFORE UPDATE ON subscription_cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_cancellation_request_updated_at();

-- RLS Policies
ALTER TABLE subscription_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent créer leurs propres demandes
CREATE POLICY "Users can insert own cancellation requests"
  ON subscription_cancellation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view own cancellation requests"
  ON subscription_cancellation_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Les admins (via service_role) peuvent tout faire — pas de policy nécessaire
-- car le service_role bypasse les RLS

-- Commentaires
COMMENT ON TABLE subscription_cancellation_requests IS 'Demandes d''annulation d''abonnement soumises par les utilisateurs, traitées par les administrateurs';
COMMENT ON COLUMN subscription_cancellation_requests.status IS 'pending: en attente de traitement, approved: approuvée, rejected: refusée, processed: traitée et finalisée';
