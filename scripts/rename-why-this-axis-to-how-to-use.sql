-- Migration : Renommage de la colonne why_this_axis -> how_to_use
-- Le bloc "Pourquoi cet axe" devient "Comment s'en servir" dans l'UI.
-- À exécuter dans le SQL Editor Supabase.

-- 1) Si la colonne how_to_use n'existe pas encore et que why_this_axis existe, on renomme.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaigns' AND column_name = 'why_this_axis'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaigns' AND column_name = 'how_to_use'
    ) THEN
        ALTER TABLE campaigns RENAME COLUMN why_this_axis TO how_to_use;
    END IF;
END $$;

-- 2) Si aucune des deux colonnes n'existe, on crée how_to_use.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS how_to_use TEXT;

-- 3) Mise à jour du commentaire.
COMMENT ON COLUMN campaigns.how_to_use IS 'Comment s''en servir — conseils pratiques pour s''inspirer de cette campagne';
