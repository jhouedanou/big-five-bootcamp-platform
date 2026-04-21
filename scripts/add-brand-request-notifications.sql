-- Migration: Support du type de notification brand_request_completed
-- Déclenché automatiquement quand l'admin passe une demande au statut "completed"
--
-- Aucune modification de schéma requise : la colonne `type` de la table
-- `notifications` est déjà de type TEXT sans contrainte ENUM.
--
-- Ce script est fourni à titre documentaire et pour vérification RLS.

-- 1. Vérifier que les politiques RLS permettent bien à l'admin d'insérer
--    des notifications pour n'importe quel user_id (via service_role).
--    La route API utilise getSupabaseAdmin() (service_role), donc pas de
--    restriction RLS côté insertion.

-- 2. S'assurer que les utilisateurs peuvent lire leurs propres notifications.
--    (déjà couvert par la migration add-notifications-system.sql)

-- 3. Index optionnel pour accélérer la requête "notifications non lues par type"
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_read
  ON notifications (user_id, type, read)
  WHERE read = false;

-- 4. Index sur action_url pour les notifications de marques (facultatif)
CREATE INDEX IF NOT EXISTS idx_notifications_action_url
  ON notifications (action_url)
  WHERE action_url IS NOT NULL;
