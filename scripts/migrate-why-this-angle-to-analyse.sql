-- =============================================================
-- Migration : why_this_angle → analyse
-- =============================================================
-- Cette migration :
-- 1. Crée la colonne "analyse" si elle n'existe pas
-- 2. Copie les données de "why_this_angle" vers "analyse" (seulement si analyse est vide)
-- 3. Supprime la colonne "why_this_angle"
-- =============================================================
-- NOTE : "analyse" est un mot réservé PostgreSQL, il faut l'échapper avec ""

-- Étape 1 : Ajouter la colonne "analyse" si elle n'existe pas déjà
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "analyse" TEXT;

-- Étape 2 : Copier les données de why_this_angle vers analyse
-- Ne remplace que les lignes où analyse est NULL ou vide
UPDATE campaigns
SET "analyse" = why_this_angle
WHERE ("analyse" IS NULL OR "analyse" = '')
  AND why_this_angle IS NOT NULL
  AND why_this_angle != '';

-- Étape 3 : Supprimer l'ancienne colonne why_this_angle
ALTER TABLE campaigns DROP COLUMN IF EXISTS why_this_angle;

-- Étape 4 : Ajouter un commentaire sur la colonne analyse
COMMENT ON COLUMN campaigns."analyse" IS 'Analyse stratégique de la campagne';

-- Vérification : afficher les campagnes avec une analyse
-- SELECT id, title, LEFT("analyse", 80) AS analyse_preview FROM campaigns WHERE "analyse" IS NOT NULL LIMIT 10;
