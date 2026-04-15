-- Ajouter la colonne publication_url à la table campaigns
-- Permet de stocker le lien vers la publication d'origine (Facebook, Instagram, etc.)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS publication_url TEXT DEFAULT NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN campaigns.publication_url IS 'URL de la publication d''origine sur la plateforme (Facebook, Instagram, etc.)';
