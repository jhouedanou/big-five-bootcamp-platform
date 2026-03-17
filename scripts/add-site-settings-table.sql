-- Table pour stocker les paramètres configurables du site
-- Exécuter ce script dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les paramètres par défaut pour les emails de contact
INSERT INTO site_settings (key, value, description) VALUES
  ('contact_to_email', 'jhouedanou@gmail.com', 'Adresse email qui reçoit les messages du formulaire de contact'),
  ('contact_from_email', 'Big Five <onboarding@resend.dev>', 'Adresse email expéditrice pour les messages de contact')
ON CONFLICT (key) DO NOTHING;

-- Si la table existait déjà avec l'ancienne adresse, mettre à jour
UPDATE site_settings SET value = 'jhouedanou@gmail.com', updated_at = NOW()
WHERE key = 'contact_to_email' AND value = 'contact@bigfive.solutions.com';

-- Politique RLS : lecture publique, écriture réservée aux admins
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les paramètres (nécessaire pour l'API contact)
CREATE POLICY "site_settings_read_all" ON site_settings
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier (via service_role key dans l'API)
CREATE POLICY "site_settings_update_service_role" ON site_settings
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "site_settings_insert_service_role" ON site_settings
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
