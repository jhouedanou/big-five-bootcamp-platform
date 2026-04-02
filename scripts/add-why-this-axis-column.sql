-- =============================================================
-- Migration : Ajout de la colonne why_this_axis
-- =============================================================
-- Ajoute la colonne "why_this_axis" à la table campaigns
-- pour stocker la justification de l'axe créatif utilisé.
-- =============================================================

-- Ajouter la colonne why_this_axis si elle n'existe pas
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS why_this_axis TEXT;

-- Commentaire sur la colonne
COMMENT ON COLUMN campaigns.why_this_axis IS 'Justification de l''axe créatif utilisé pour cette campagne';
