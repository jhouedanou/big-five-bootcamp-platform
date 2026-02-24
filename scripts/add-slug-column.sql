-- Migration: Ajouter la colonne slug à la table campaigns
-- Cette colonne permet d'avoir des URLs SEO-friendly (/content/campagne-mtn-mobile-money)
-- au lieu des UUIDs (/content/9ee6efdc-b426-4f1b-95cb-c32c0dfe4f5d)

-- 1. Ajouter la colonne slug
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug VARCHAR(300);

-- 2. Générer les slugs pour les campagnes existantes à partir du titre
UPDATE campaigns 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              title,
              'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'),
              'à', 'a'), 'â', 'a'), 'ä', 'a'),
              'ù', 'u'), 'û', 'u'), 'ü', 'u'),
              'ô', 'o'), 'ö', 'o'),
              'î', 'i'), 'ï', 'i'),
          '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'),
      '-+', '-', 'g'),
    '^-|-$', '', 'g')
)
WHERE slug IS NULL;

-- 3. Gérer les doublons en ajoutant un suffixe numérique
-- D'abord, identifier et résoudre les doublons
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug VARCHAR(300);
BEGIN
  FOR rec IN 
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
    FROM campaigns
    WHERE slug IN (
      SELECT slug FROM campaigns GROUP BY slug HAVING COUNT(*) > 1
    )
  LOOP
    IF rec.rn > 1 THEN
      counter := rec.rn;
      new_slug := rec.slug || '-' || counter;
      -- Vérifier que le nouveau slug n'existe pas déjà
      WHILE EXISTS (SELECT 1 FROM campaigns WHERE slug = new_slug AND id != rec.id) LOOP
        counter := counter + 1;
        new_slug := rec.slug || '-' || counter;
      END LOOP;
      UPDATE campaigns SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- 4. Rendre la colonne NOT NULL et UNIQUE
ALTER TABLE campaigns ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_slug_unique ON campaigns(slug);

-- 5. Créer un index pour la recherche rapide par slug
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);

-- Vérification : afficher les campagnes avec leurs slugs
-- SELECT id, title, slug FROM campaigns ORDER BY created_at DESC LIMIT 20;
