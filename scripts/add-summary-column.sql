-- Ajouter la colonne summary à la table campaigns
-- Cette colonne contient un court résumé de la campagne (max 150 caractères)

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Optionnel: Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN campaigns.summary IS 'Court résumé de la campagne affiché sur les cartes (max 150 caractères)';
