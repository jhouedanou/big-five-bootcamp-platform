-- Migration: Ajout de la colonne "description" à la table campaigns
-- Si la colonne existe déjà, cette commande est sans effet (IF NOT EXISTS)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'campaigns'
          AND column_name = 'description'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN description TEXT;
        RAISE NOTICE 'Colonne "description" ajoutée avec succès à la table campaigns.';
    ELSE
        RAISE NOTICE 'La colonne "description" existe déjà dans la table campaigns.';
    END IF;
END
$$;
