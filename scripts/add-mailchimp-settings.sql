-- =============================================================
-- Migration : Ajout des paramètres Mailchimp dans site_settings
-- =============================================================
-- Cette migration ajoute les clés de configuration Mailchimp
-- dans la table site_settings existante.
-- La clé API est stockée chiffrée (le chiffrement se fait côté application).
-- =============================================================

-- Insérer les paramètres Mailchimp par défaut
INSERT INTO site_settings (key, value, description) VALUES
  ('mailchimp_api_key', '', 'Clé API Mailchimp (chiffrée)'),
  ('mailchimp_audience_id', '', 'ID de la liste/audience Mailchimp'),
  ('mailchimp_from_name', '', 'Nom de l''expéditeur pour les campagnes Mailchimp'),
  ('mailchimp_from_email', '', 'Email de l''expéditeur pour les campagnes Mailchimp'),
  ('mailchimp_default_tag', '', 'Tag ou segment par défaut (optionnel)')
ON CONFLICT (key) DO NOTHING;
