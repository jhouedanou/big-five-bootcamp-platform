-- ============================================================
-- Fix storage bucket RLS policies
-- Buckets restent public (URLs directes fonctionnent)
-- Listing anonyme désactivé
-- Run once in Supabase SQL Editor
-- ============================================================

-- ===== BUCKET: avatars =====

-- Supprimer la policy trop large (liste tous les avatars à n'importe qui)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Remplacer: chaque user voit uniquement son propre dossier
CREATE POLICY "avatars_own_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===== BUCKET: shoo (thumbnails + documents campagnes) =====

-- Supprimer policies larges si elles existent
DROP POLICY IF EXISTS "shoo_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_3" ON storage.objects;

-- Admins peuvent lister/lire (pour l'interface admin)
DROP POLICY IF EXISTS "shoo_admin_read" ON storage.objects;
CREATE POLICY "shoo_admin_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'shoo'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins peuvent uploader
DROP POLICY IF EXISTS "shoo_admin_insert" ON storage.objects;
CREATE POLICY "shoo_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shoo'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins peuvent supprimer
DROP POLICY IF EXISTS "shoo_admin_delete" ON storage.objects;
CREATE POLICY "shoo_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'shoo'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- Note: les uploads via /api/upload utilisent la service_role key
-- → RLS ne s'applique pas aux opérations server-side
-- → Ces policies bloquent uniquement le listing client-side anonyme
-- ============================================================
