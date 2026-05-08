-- ============================================================================
-- Purge des anciennes demandes de suivi de marques
--
-- À EXÉCUTER MANUELLEMENT dans le SQL Editor de Supabase.
-- ATTENTION : opération destructive et irréversible.
--
-- Recommandation : faire un backup de la table avant exécution.
--   create table public.brand_requests_backup_2026 as
--     select * from public.brand_requests;
-- ============================================================================

-- 1. Supprimer les notifications associées
DELETE FROM public.notifications
WHERE type LIKE 'brand_request_%';

-- 2. Supprimer les demandes
DELETE FROM public.brand_requests;

-- 3. Vérification
SELECT
  (SELECT COUNT(*) FROM public.brand_requests)        AS demandes_restantes,
  (SELECT COUNT(*) FROM public.notifications
     WHERE type LIKE 'brand_request_%')               AS notifs_restantes;
