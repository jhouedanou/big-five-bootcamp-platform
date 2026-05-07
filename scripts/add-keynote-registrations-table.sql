-- Table des inscriptions au keynote LAVEIYE du 21 mai 2026
-- + codes promo de pré-lancement (3 mois pour 10 000 FCFA, valables 48h post-keynote)
-- À exécuter dans Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS keynote_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  country TEXT,
  promo_code TEXT NOT NULL UNIQUE,
  -- Suivi Mailchimp
  mailchimp_synced_at TIMESTAMPTZ,
  mailchimp_status TEXT, -- 'subscribed' | 'pending' | 'error' | NULL
  mailchimp_error TEXT,
  -- Conversion
  promo_redeemed_at TIMESTAMPTZ,
  -- Méta
  ip TEXT,
  user_agent TEXT,
  source TEXT DEFAULT 'keynote-page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keynote_registrations_email ON keynote_registrations (email);
CREATE INDEX IF NOT EXISTS idx_keynote_registrations_promo ON keynote_registrations (promo_code);
CREATE INDEX IF NOT EXISTS idx_keynote_registrations_created ON keynote_registrations (created_at DESC);

-- RLS : seul le service_role peut lire/écrire (les API admin & publique passent par la clé service)
ALTER TABLE keynote_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "keynote_registrations_service_all" ON keynote_registrations;
CREATE POLICY "keynote_registrations_service_all" ON keynote_registrations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Paramètres par défaut pour la cible Mailchimp (audience + tag) du keynote.
-- Si mailchimp_keynote_audience_id est vide, on retombe sur mailchimp_audience_id (audience principale).
INSERT INTO site_settings (key, value, description) VALUES
  ('mailchimp_keynote_audience_id', '', 'ID de l''audience Mailchimp dédiée au keynote LAVEIYE (laisser vide pour utiliser l''audience principale)'),
  ('mailchimp_keynote_tag', 'keynote-2026', 'Tag Mailchimp appliqué aux inscrits du keynote'),
  ('mailchimp_keynote_promo_tag', 'promo-pre-launch', 'Tag Mailchimp appliqué pour la promo pré-lancement')
ON CONFLICT (key) DO NOTHING;
