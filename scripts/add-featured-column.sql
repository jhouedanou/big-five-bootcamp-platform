-- Ajouter la colonne "featured" à la table campaigns
-- Permet aux admins de marquer des campagnes comme "Campagne de la semaine"
-- Ces campagnes apparaissent en priorité dans la section "Meilleures campagnes" du dashboard

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- Index pour accélérer les requêtes sur les campagnes featured
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON campaigns (featured) WHERE featured = TRUE;
