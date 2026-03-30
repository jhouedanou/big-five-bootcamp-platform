-- ============================================================
-- Activer RLS sur payments, notifications, scheduled_reminders
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================
--
-- Ces 3 tables sont accédées UNIQUEMENT via le service role key
-- (API routes, webhooks, cron jobs). Le client anon n'y accède jamais.
-- On active RLS et on bloque tout accès anon par défaut.
-- Le service role bypass automatiquement RLS.
-- ============================================================

-- ==============================================
-- 1. TABLE: payments
-- ==============================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent voir leurs propres paiements
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Seul le service role peut insérer/modifier/supprimer (webhooks, API routes)
-- Note: le service role bypass RLS automatiquement, pas besoin de policy explicite

-- ==============================================
-- 2. TABLE: notifications
-- ==============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent marquer leurs propres notifications comme lues
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Seul le service role peut créer/supprimer des notifications (RPCs, cron)

-- ==============================================
-- 3. TABLE: scheduled_reminders
-- ==============================================

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Aucun accès client nécessaire - géré entièrement côté serveur
-- Les triggers DB et cron jobs utilisent SECURITY DEFINER ou service role

-- ==============================================
-- Vérification
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE 'RLS activé sur payments, notifications, scheduled_reminders';
  RAISE NOTICE 'payments: SELECT propres paiements (par email)';
  RAISE NOTICE 'notifications: SELECT/UPDATE propres notifications (par user_id)';
  RAISE NOTICE 'scheduled_reminders: aucun accès client (service role uniquement)';
END $$;
