-- Migration : Configuration des moyens de paiement Moneroo par pays
-- Cette migration ajoute les clés nécessaires dans site_settings
-- pour stocker la configuration des moyens de paiement par pays.

INSERT INTO site_settings (key, value, description) VALUES
  ('payment_methods_config', '{}', 'Configuration JSON des moyens de paiement Moneroo par pays')
ON CONFLICT (key) DO NOTHING;
