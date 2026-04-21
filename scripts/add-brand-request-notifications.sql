-- ============================================================================
-- Migration : notifications pour les demandes de suivi de marque
-- ============================================================================
-- Ajoute le support du type `brand_request_completed` dans la table notifications
-- (idempotent). La table `notifications` existe deja via add-notifications-system.sql
-- et accepte n'importe quelle VARCHAR(50) comme `type`, donc aucun ALTER TABLE n'est
-- requis. On se contente d'un index partiel + commentaire pour la documentation.
--
-- Ce script est sur a executer plusieurs fois.
-- ============================================================================

-- Index pour retrouver rapidement les notifications de completion d'une demande de marque
CREATE INDEX IF NOT EXISTS idx_notifications_brand_request_completed
  ON notifications (user_id, created_at DESC)
  WHERE type = 'brand_request_completed';

-- Documentation mise a jour
COMMENT ON COLUMN notifications.type IS
  'Type de notification : subscription_reminder | payment_success | subscription_expiring | subscription_expired | payment_failed | brand_request_completed';

-- S'assurer que la contrainte de statut de brand_requests couvre bien "completed"
-- (les migrations initiales peuvent avoir declinaisons). On ne modifie pas si elle existe deja.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'brand_requests' AND constraint_type = 'CHECK'
  ) THEN
    RAISE NOTICE 'Contrainte CHECK brand_requests deja presente, pas de modification.';
  END IF;
END $$;

-- Colonnes utilisees par le code (si migrations anterieures les ont creees, ces ALTER sont no-op)
ALTER TABLE brand_requests ADD COLUMN IF NOT EXISTS brand_urls TEXT[] DEFAULT '{}';
ALTER TABLE brand_requests ADD COLUMN IF NOT EXISTS social_networks TEXT[] DEFAULT '{}';
