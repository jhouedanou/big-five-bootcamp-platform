-- ============================================================================
-- Extension du workflow "Suivi de marques" : statuts B2B + devis + paiement
-- + renouvellement mensuel automatique.
--
-- À exécuter dans le SQL Editor de Supabase. Idempotent grâce aux IF NOT EXISTS.
-- ============================================================================

-- 1. Nouvelles colonnes -------------------------------------------------------
ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS devis_amount              numeric(12,2),
  ADD COLUMN IF NOT EXISTS devis_currency            text DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS devis_url                 text,
  ADD COLUMN IF NOT EXISTS devis_sent_at             timestamptz,
  ADD COLUMN IF NOT EXISTS devis_accepted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at                   timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reference         text,
  ADD COLUMN IF NOT EXISTS payment_method            text,
  ADD COLUMN IF NOT EXISTS renewed_at                timestamptz,
  ADD COLUMN IF NOT EXISTS next_renewal_at           timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew                boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancelled_at              timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at  timestamptz;

-- 2. Étendre la contrainte CHECK sur status ----------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brand_requests_status_check'
  ) THEN
    ALTER TABLE public.brand_requests
      DROP CONSTRAINT brand_requests_status_check;
  END IF;
END $$;

ALTER TABLE public.brand_requests
  ADD CONSTRAINT brand_requests_status_check
  CHECK (status IN (
    'pending',
    'quote_in_preparation',
    'quote_sent',
    'quote_accepted',
    'in_payment',
    'in_production',
    'completed',
    'rejected',
    'cancelled',
    -- legacy (compat ascendante)
    'accepted',
    'in_progress'
  ));

-- 3. Index sur next_renewal_at pour le cron J-7 ------------------------------
CREATE INDEX IF NOT EXISTS idx_brand_requests_next_renewal
  ON public.brand_requests (next_renewal_at)
  WHERE auto_renew = true AND status = 'completed';

-- 4. RLS — autoriser l'utilisateur à mettre à jour ses demandes "actives"
--    (avant : seulement status='pending'. Désormais aussi quote_sent →
--    accepter/refuser, et completed → résilier le renouvellement.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_requests'
      AND policyname = 'Users can update their own pending requests'
  ) THEN
    DROP POLICY "Users can update their own pending requests"
      ON public.brand_requests;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_requests'
      AND policyname = 'Users can update their own active requests'
  ) THEN
    CREATE POLICY "Users can update their own active requests"
      ON public.brand_requests
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
