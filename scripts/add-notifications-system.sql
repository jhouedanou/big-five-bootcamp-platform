-- Migration: Système de notifications pour les abonnements
-- Date: 2026-02-12
-- Description: Ajoute les tables et fonctions pour gérer les notifications d'abonnement

-- ============================================================================
-- 1. TABLE DES NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Commentaires
COMMENT ON TABLE notifications IS 'Stocke toutes les notifications utilisateur';
COMMENT ON COLUMN notifications.type IS 'Type: subscription_reminder, payment_success, subscription_expiring, subscription_expired, payment_failed';
COMMENT ON COLUMN notifications.read IS 'Si la notification a été lue par l''utilisateur';
COMMENT ON COLUMN notifications.action_url IS 'URL d''action (ex: /subscribe, /profile)';
COMMENT ON COLUMN notifications.metadata IS 'Données supplémentaires en JSON';

-- ============================================================================
-- 2. TABLE DES RAPPELS PLANIFIÉS
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Index
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_id ON scheduled_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_for ON scheduled_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_sent ON scheduled_reminders(sent);

-- Commentaires
COMMENT ON TABLE scheduled_reminders IS 'Rappels planifiés pour les utilisateurs non premium';
COMMENT ON COLUMN scheduled_reminders.reminder_type IS 'Type: premium_reminder_5d, premium_reminder_10d, subscription_expiring_7d, subscription_expiring_3d, subscription_expiring_1d';

-- ============================================================================
-- 3. FONCTION: Créer une notification
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_action_url VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_metadata
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_notification IS 'Crée une nouvelle notification pour un utilisateur';

-- ============================================================================
-- 4. FONCTION: Planifier des rappels pour utilisateurs non-premium
-- ============================================================================

CREATE OR REPLACE FUNCTION schedule_premium_reminders(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_user_status VARCHAR;
  v_created_at TIMESTAMP;
BEGIN
  -- Vérifier le statut de l'utilisateur
  SELECT subscription_status, created_at 
  INTO v_user_status, v_created_at
  FROM users 
  WHERE id = p_user_id;
  
  -- Si déjà premium, ne rien faire
  IF v_user_status = 'active' THEN
    RETURN;
  END IF;
  
  -- Planifier un rappel tous les 5 jours (jusqu'à 30 jours)
  FOR i IN 1..6 LOOP
    INSERT INTO scheduled_reminders (
      user_id,
      reminder_type,
      scheduled_for,
      metadata
    ) VALUES (
      p_user_id,
      'premium_reminder_' || (i * 5) || 'd',
      v_created_at + (i * 5 || ' days')::INTERVAL,
      jsonb_build_object('day', i * 5)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION schedule_premium_reminders IS 'Planifie des rappels tous les 5 jours pour les utilisateurs non-premium';

-- ============================================================================
-- 5. FONCTION: Envoyer les rappels planifiés
-- ============================================================================

CREATE OR REPLACE FUNCTION send_scheduled_reminders()
RETURNS TABLE(reminder_id UUID, user_id UUID, notification_id UUID) AS $$
DECLARE
  v_reminder RECORD;
  v_notification_id UUID;
  v_day_number INT;
BEGIN
  -- Parcourir tous les rappels à envoyer
  FOR v_reminder IN 
    SELECT sr.*, u.email, u.name
    FROM scheduled_reminders sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.sent = FALSE 
      AND sr.scheduled_for <= NOW()
      AND u.subscription_status != 'active'
    LIMIT 100
  LOOP
    -- Extraire le numéro du jour
    v_day_number := (v_reminder.metadata->>'day')::INT;
    
    -- Créer la notification
    v_notification_id := create_notification(
      v_reminder.user_id,
      'subscription_reminder',
      '🌟 Passez Premium et débloquez tout !',
      format('Cela fait %s jours que vous utilisez Big Five en version gratuite. Passez Premium pour seulement 4 500 XOF/mois et accédez à toute la bibliothèque de créatives !', v_day_number),
      '/subscribe',
      jsonb_build_object(
        'day_number', v_day_number,
        'reminder_type', v_reminder.reminder_type
      )
    );
    
    -- Marquer le rappel comme envoyé
    UPDATE scheduled_reminders
    SET sent = TRUE, sent_at = NOW()
    WHERE id = v_reminder.id;
    
    -- Retourner les informations
    reminder_id := v_reminder.id;
    user_id := v_reminder.user_id;
    notification_id := v_notification_id;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION send_scheduled_reminders IS 'Envoie les rappels planifiés qui sont dus. À exécuter régulièrement (cron job).';

-- ============================================================================
-- 6. FONCTION: Notification après paiement réussi
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_payment_success(
  p_user_id UUID,
  p_amount INT,
  p_subscription_end_date TIMESTAMP
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_days_remaining INT;
BEGIN
  v_days_remaining := EXTRACT(DAY FROM (p_subscription_end_date - NOW()));
  
  v_notification_id := create_notification(
    p_user_id,
    'payment_success',
    '✅ Paiement confirmé !',
    format('Votre abonnement Premium est maintenant actif pour %s jours. Profitez de toutes les fonctionnalités !', v_days_remaining),
    '/dashboard',
    jsonb_build_object(
      'amount', p_amount,
      'subscription_end_date', p_subscription_end_date,
      'days_remaining', v_days_remaining
    )
  );
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_payment_success IS 'Crée une notification après un paiement réussi';

-- ============================================================================
-- 7. FONCTION: Notification d'échec de paiement
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_payment_failed(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  v_notification_id := create_notification(
    p_user_id,
    'payment_failed',
    '❌ Échec du paiement',
    format('Votre paiement n''a pas pu être traité. Raison: %s. Veuillez réessayer.', p_reason),
    '/subscribe',
    jsonb_build_object('reason', p_reason)
  );
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FONCTION: Notifications d'expiration d'abonnement
-- ============================================================================

CREATE OR REPLACE FUNCTION check_expiring_subscriptions()
RETURNS TABLE(user_id UUID, notification_id UUID, days_remaining INT) AS $$
DECLARE
  v_user RECORD;
  v_notification_id UUID;
  v_days_remaining INT;
BEGIN
  -- Vérifier les abonnements qui expirent dans 7, 3 ou 1 jour
  FOR v_user IN 
    SELECT u.id, u.email, u.name, u.subscription_end_date
    FROM users u
    WHERE u.subscription_status = 'active'
      AND u.subscription_end_date IS NOT NULL
      AND u.subscription_end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  LOOP
    v_days_remaining := EXTRACT(DAY FROM (v_user.subscription_end_date - NOW()))::INT;
    
    -- Notification à 7 jours
    IF v_days_remaining = 7 THEN
      v_notification_id := create_notification(
        v_user.id,
        'subscription_expiring',
        '⏰ Votre abonnement expire dans 7 jours',
        'Renouvelez dès maintenant pour continuer à profiter de toutes les fonctionnalités Premium !',
        '/subscribe',
        jsonb_build_object('days_remaining', 7)
      );
    END IF;
    
    -- Notification à 3 jours
    IF v_days_remaining = 3 THEN
      v_notification_id := create_notification(
        v_user.id,
        'subscription_expiring',
        '⚠️ Votre abonnement expire dans 3 jours',
        'Ne perdez pas l''accès à votre contenu Premium ! Renouvelez maintenant.',
        '/subscribe',
        jsonb_build_object('days_remaining', 3)
      );
    END IF;
    
    -- Notification à 1 jour
    IF v_days_remaining <= 1 THEN
      v_notification_id := create_notification(
        v_user.id,
        'subscription_expiring',
        '🚨 Votre abonnement expire demain !',
        'Dernier jour pour renouveler votre abonnement Premium et continuer à accéder à tout le contenu.',
        '/subscribe',
        jsonb_build_object('days_remaining', v_days_remaining)
      );
    END IF;
    
    user_id := v_user.id;
    notification_id := v_notification_id;
    days_remaining := v_days_remaining;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_expiring_subscriptions IS 'Crée des notifications pour les abonnements qui expirent bientôt (7, 3, 1 jour)';

-- ============================================================================
-- 9. FONCTION: Notification après expiration
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_subscription_expired()
RETURNS TABLE(user_id UUID, notification_id UUID) AS $$
DECLARE
  v_user RECORD;
  v_notification_id UUID;
BEGIN
  -- Trouver les abonnements expirés aujourd'hui
  FOR v_user IN 
    SELECT u.id, u.email, u.name
    FROM users u
    WHERE u.subscription_status = 'expired'
      AND u.subscription_end_date::DATE = CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = u.id
          AND n.type = 'subscription_expired'
          AND n.created_at::DATE = CURRENT_DATE
      )
  LOOP
    v_notification_id := create_notification(
      v_user.id,
      'subscription_expired',
      '😔 Votre abonnement Premium a expiré',
      'Votre abonnement Premium est arrivé à échéance. Renouvelez-le maintenant pour retrouver l''accès à tout le contenu !',
      '/subscribe',
      jsonb_build_object('expired_at', NOW())
    );
    
    user_id := v_user.id;
    notification_id := v_notification_id;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_subscription_expired IS 'Crée une notification pour les abonnements qui viennent d''expirer';

-- ============================================================================
-- 10. TRIGGER: Planifier des rappels à la création d'un utilisateur
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_schedule_premium_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Planifier les rappels seulement si l'utilisateur n'est pas premium
  IF NEW.subscription_status IS NULL OR NEW.subscription_status != 'active' THEN
    PERFORM schedule_premium_reminders(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_schedule_reminders ON users;
CREATE TRIGGER on_user_created_schedule_reminders
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_premium_reminders();

COMMENT ON FUNCTION trigger_schedule_premium_reminders IS 'Trigger qui planifie automatiquement les rappels Premium à la création d''un utilisateur';

-- ============================================================================
-- 11. FONCTION PRINCIPALE: Traiter toutes les notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION process_all_notifications()
RETURNS TABLE(
  action VARCHAR,
  count BIGINT
) AS $$
DECLARE
  v_reminders_count BIGINT;
  v_expiring_count BIGINT;
  v_expired_count BIGINT;
BEGIN
  -- 1. Envoyer les rappels planifiés
  SELECT COUNT(*) INTO v_reminders_count
  FROM send_scheduled_reminders();
  
  action := 'scheduled_reminders';
  count := v_reminders_count;
  RETURN NEXT;
  
  -- 2. Vérifier les abonnements qui expirent
  SELECT COUNT(*) INTO v_expiring_count
  FROM check_expiring_subscriptions();
  
  action := 'expiring_subscriptions';
  count := v_expiring_count;
  RETURN NEXT;
  
  -- 3. Notifier les abonnements expirés
  SELECT COUNT(*) INTO v_expired_count
  FROM notify_subscription_expired();
  
  action := 'expired_subscriptions';
  count := v_expired_count;
  RETURN NEXT;
  
  -- 4. Mettre à jour les statuts expirés
  PERFORM check_expired_subscriptions();
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_all_notifications IS 'Fonction principale à exécuter régulièrement (cron job) pour traiter toutes les notifications';

-- ============================================================================
-- 12. FONCTION: Nettoyer les anciennes notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS BIGINT AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- Supprimer les notifications lues de plus de 30 jours
  DELETE FROM notifications
  WHERE read = TRUE
    AND read_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Supprime les notifications lues de plus de 30 jours';

-- ============================================================================
-- INSTRUCTIONS POUR CRON JOB
-- ============================================================================

-- À exécuter régulièrement (toutes les heures ou quotidiennement):
-- SELECT * FROM process_all_notifications();

-- À exécuter hebdomadairement:
-- SELECT cleanup_old_notifications();

-- Si vous utilisez pg_cron (extension PostgreSQL):
-- SELECT cron.schedule('process-notifications', '0 * * * *', 'SELECT process_all_notifications();');
-- SELECT cron.schedule('cleanup-notifications', '0 0 * * 0', 'SELECT cleanup_old_notifications();');
