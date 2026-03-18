-- Migration: Ajouter les colonnes manquantes à la table collections
-- À exécuter dans le Supabase SQL Editor

-- Ajouter la colonne description (manquante par rapport au schéma prévu)
ALTER TABLE collections ADD COLUMN IF NOT EXISTS description TEXT;

-- Ajouter les colonnes de partage (de add-collection-sharing.sql)
ALTER TABLE collections ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- Index unique sur share_token (partiel, seulement les non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_share_token
  ON collections(share_token) WHERE share_token IS NOT NULL;

-- Policy publique : lecture seule via share_token (sans auth)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view shared collections" ON collections;
END $$;

CREATE POLICY "Anyone can view shared collections" ON collections
  FOR SELECT USING (is_shared = true AND share_token IS NOT NULL);
