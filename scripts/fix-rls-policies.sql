-- Script pour corriger les politiques RLS qui causent une récursion infinie
-- À exécuter dans le SQL Editor de Supabase

-- ==============================================
-- CORRECTION DES POLITIQUES RLS
-- ==============================================

-- Le problème: Les politiques sur "users" font référence à la table "users" 
-- pour vérifier si l'utilisateur est admin, ce qui déclenche à nouveau 
-- la politique et crée une boucle infinie.

-- Solution: Utiliser une fonction SECURITY DEFINER qui bypass RLS

-- 1. Créer une fonction pour vérifier si un utilisateur est admin (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

DROP POLICY IF EXISTS "Published campaigns are viewable by everyone" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;

-- ==============================================
-- NOUVELLES POLITIQUES RLS - USERS
-- ==============================================

-- Politique SELECT: voir son propre profil OU être admin
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (
    auth.uid() = id 
    OR public.is_admin(auth.uid())
  );

-- Politique UPDATE: modifier son propre profil
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique INSERT/DELETE pour admins uniquement
CREATE POLICY "Admins can insert users" 
  ON public.users FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete users" 
  ON public.users FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- Politique UPDATE pour admins (peut modifier n'importe quel user)
CREATE POLICY "Admins can update any user" 
  ON public.users FOR UPDATE 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ==============================================
-- NOUVELLES POLITIQUES RLS - CAMPAIGNS
-- ==============================================

-- Tout le monde peut voir les campagnes publiées (même sans auth)
CREATE POLICY "Published campaigns are viewable by everyone" 
  ON campaigns FOR SELECT 
  USING (
    status = 'Publié' 
    OR author_id = auth.uid() 
    OR public.is_admin(auth.uid())
  );

-- Users authentifiés peuvent créer des campagnes
CREATE POLICY "Authenticated users can create campaigns" 
  ON campaigns FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users peuvent modifier leurs propres campagnes ou admins
CREATE POLICY "Users can update own campaigns" 
  ON campaigns FOR UPDATE 
  USING (
    author_id = auth.uid() 
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid() 
    OR public.is_admin(auth.uid())
  );

-- Users peuvent supprimer leurs propres campagnes ou admins
CREATE POLICY "Users can delete own campaigns" 
  ON campaigns FOR DELETE 
  USING (
    author_id = auth.uid() 
    OR public.is_admin(auth.uid())
  );

-- ==============================================
-- POLITIQUE SPECIALE: Service Role bypass
-- ==============================================

-- Permettre au service role de tout faire (pour les API routes)
-- Cette politique permet les requêtes avec la service_role key

CREATE POLICY "Service role has full access to users"
  ON public.users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to campaigns"
  ON campaigns FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS corrigées avec succès!';
  RAISE NOTICE '👉 La fonction is_admin() utilise SECURITY DEFINER pour éviter la récursion';
END $$;
