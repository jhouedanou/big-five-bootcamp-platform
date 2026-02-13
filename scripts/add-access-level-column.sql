-- ==============================================
-- AJOUTER LA COLONNE access_level À LA TABLE campaigns
-- ==============================================

-- Ajouter la colonne access_level si elle n'existe pas
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'free' 
CHECK (access_level IN ('free', 'premium'));

-- Mettre à jour les campagnes existantes sans access_level
UPDATE campaigns 
SET access_level = 'free' 
WHERE access_level IS NULL;

-- Créer un index pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_campaigns_access_level ON campaigns(access_level);

-- ==============================================
-- VÉRIFICATION
-- ==============================================

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'campaigns' AND column_name = 'access_level';

-- Afficher les campagnes avec leur niveau d'accès
SELECT id, title, status, access_level 
FROM campaigns 
ORDER BY created_at DESC 
LIMIT 10;
