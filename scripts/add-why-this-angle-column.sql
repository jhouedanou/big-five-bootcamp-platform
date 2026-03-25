-- Ajouter la colonne "why_this_angle" (Pourquoi cet axe) à la table campaigns
-- L'ancien champ "description" est renommé en "Analyse" dans l'UI uniquement

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS why_this_angle TEXT;

-- Commentaire pour documenter
COMMENT ON COLUMN campaigns.why_this_angle IS 'Pourquoi cet axe - explication du choix stratégique de la campagne';
COMMENT ON COLUMN campaigns.description IS 'Analyse - analyse détaillée de la campagne';
