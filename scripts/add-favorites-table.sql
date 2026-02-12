-- ==============================================
-- TABLE FAVORIS - Système de favoris utilisateurs
-- ==============================================

-- Table des favoris utilisateurs
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(user_id, campaign_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_campaign_id ON favorites(campaign_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Activer RLS sur la table favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres favoris
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent ajouter des favoris
CREATE POLICY "Users can add favorites" ON favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres favoris
CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Politique: Les admins peuvent tout voir
CREATE POLICY "Admins can view all favorites" ON favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ==============================================
-- VÉRIFICATION
-- ==============================================

-- Vérifier que la table a été créée
SELECT 'Table favorites créée avec succès!' as message;

-- Afficher la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'favorites'
ORDER BY ordinal_position;
