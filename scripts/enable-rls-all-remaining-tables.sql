-- ============================================================================
-- Activation de RLS sur toutes les tables restantes du schéma public
-- À exécuter dans le SQL Editor de Supabase.
--
-- Stratégie :
--   * Toutes les routes /api utilisent le SERVICE ROLE qui bypasse RLS.
--   * Les composants serveur (pages SSR) utilisent aussi getSupabaseAdmin().
--   * Seules quelques requêtes côté client (browser, clé anon) accèdent
--     directement aux tables. On ajoute des policies minimales pour ces cas.
--
-- Tables déjà sécurisées par d'autres scripts :
--   - users          (scripts/fix-rls-policies.sql)
--   - payments       (scripts/enable-rls-payments-notifications.sql)
--   - notifications  (scripts/enable-rls-payments-notifications.sql)
--   - scheduled_reminders (idem)
--
-- IMPORTANT : exécuter ce script en une seule transaction. En cas d'erreur,
-- ROLLBACK ramène la DB à l'état initial.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. site_settings  →  lecture publique (logo, branding affichés sur landing/footer)
-- ----------------------------------------------------------------------------
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE : service role uniquement (bypass RLS automatique)


-- ----------------------------------------------------------------------------
-- 2. campaigns  →  lecture publique des campagnes publiées
-- ----------------------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns published readable" ON public.campaigns;
CREATE POLICY "campaigns published readable"
  ON public.campaigns FOR SELECT
  TO anon, authenticated
  USING (status = 'Publié');

-- Les admins peuvent tout voir (utilise la fonction is_admin de fix-rls-policies.sql)
DROP POLICY IF EXISTS "campaigns admin all" ON public.campaigns;
CREATE POLICY "campaigns admin all"
  ON public.campaigns FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ----------------------------------------------------------------------------
-- 3. reactions  →  lecture publique (compteurs), écriture par l'utilisateur
-- ----------------------------------------------------------------------------
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions public read" ON public.reactions;
CREATE POLICY "reactions public read"
  ON public.reactions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Les écritures passent par l'API /api/reactions (service role)


-- ----------------------------------------------------------------------------
-- 4. favorites  →  l'utilisateur ne voit que les siens
-- ----------------------------------------------------------------------------
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites owner read" ON public.favorites;
CREATE POLICY "favorites owner read"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites owner write" ON public.favorites;
CREATE POLICY "favorites owner write"
  ON public.favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 5. collections  →  propriétaire OU collection partagée publiquement
-- ----------------------------------------------------------------------------
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections owner all" ON public.collections;
CREATE POLICY "collections owner all"
  ON public.collections FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: les pages /shared/[token] passent par le service role, donc pas
-- besoin d'exposer is_shared=true à anon.


-- ----------------------------------------------------------------------------
-- 6. collection_items  →  via la collection parente (propriétaire)
-- ----------------------------------------------------------------------------
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_items owner all" ON public.collection_items;
CREATE POLICY "collection_items owner all"
  ON public.collection_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 7. subscription_cancellation_requests  →  l'utilisateur ne voit que les siens
-- ----------------------------------------------------------------------------
ALTER TABLE public.subscription_cancellation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancellation_requests owner read" ON public.subscription_cancellation_requests;
CREATE POLICY "cancellation_requests owner read"
  ON public.subscription_cancellation_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "cancellation_requests owner insert" ON public.subscription_cancellation_requests;
CREATE POLICY "cancellation_requests owner insert"
  ON public.subscription_cancellation_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 8. brand_requests  →  100% server-side (admin + formulaire via API)
-- ----------------------------------------------------------------------------
ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le service role peut accéder (via /api/brand-requests
-- et /api/admin/brand-requests).


-- ----------------------------------------------------------------------------
-- 9. registrations  →  100% server-side (paiement, IPN)
-- ----------------------------------------------------------------------------
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
-- Aucune policy : géré entièrement par les webhooks paiement (service role).


-- ----------------------------------------------------------------------------
-- 10. payouts, refunds, pawapay_orphan_callbacks  →  100% server-side
-- ----------------------------------------------------------------------------
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pawapay_orphan_callbacks ENABLE ROW LEVEL SECURITY;
-- Aucune policy : webhooks pawapay uniquement (service role).


-- ----------------------------------------------------------------------------
-- 11. bootcamps, sessions  →  lecture publique (catalogue)
-- ----------------------------------------------------------------------------
ALTER TABLE public.bootcamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bootcamps public read" ON public.bootcamps;
CREATE POLICY "bootcamps public read"
  ON public.bootcamps FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions public read" ON public.sessions;
CREATE POLICY "sessions public read"
  ON public.sessions FOR SELECT
  TO anon, authenticated
  USING (true);


-- ----------------------------------------------------------------------------
-- 12. creative_libraries  →  100% server-side (admin)
-- ----------------------------------------------------------------------------
ALTER TABLE public.creative_libraries ENABLE ROW LEVEL SECURITY;
-- Aucune policy : géré côté admin via service role.


-- ============================================================================
-- Vérification finale : lister les tables sans RLS dans le schéma public
-- ============================================================================
DO $$
DECLARE
  rec RECORD;
  unsecured_count INT := 0;
BEGIN
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    RAISE WARNING 'Table sans RLS : %', rec.table_name;
    unsecured_count := unsecured_count + 1;
  END LOOP;

  IF unsecured_count = 0 THEN
    RAISE NOTICE 'OK : toutes les tables du schéma public ont RLS activé.';
  ELSE
    RAISE WARNING 'ATTENTION : % table(s) sans RLS détectée(s).', unsecured_count;
  END IF;
END $$;

COMMIT;
