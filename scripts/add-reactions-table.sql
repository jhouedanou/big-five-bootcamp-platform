-- Migration : Table des réactions (like/dislike) sur les campagnes
-- À exécuter dans Supabase SQL Editor

-- Créer le type enum pour les réactions
DO $$ BEGIN
  CREATE TYPE reaction_type AS ENUM ('like', 'dislike');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table des réactions
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type reaction_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Un seul vote par utilisateur par campagne
  UNIQUE(user_id, campaign_id)
);

-- Index pour accélérer les requêtes
CREATE INDEX IF NOT EXISTS idx_reactions_campaign_id ON reactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_campaign_type ON reactions(campaign_id, type);

-- Activer RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs authentifiés peuvent lire toutes les réactions
CREATE POLICY "reactions_select_authenticated" ON reactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique : les utilisateurs peuvent insérer leurs propres réactions
CREATE POLICY "reactions_insert_own" ON reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent mettre à jour leurs propres réactions
CREATE POLICY "reactions_update_own" ON reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent supprimer leurs propres réactions
CREATE POLICY "reactions_delete_own" ON reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Accès complet pour le service_role (API admin)
CREATE POLICY "reactions_service_role" ON reactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
