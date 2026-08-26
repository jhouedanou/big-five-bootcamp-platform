-- ============================================================================
-- 19_20260826_site_settings_public_read_whitelist.sql
--
-- Restreint la lecture publique de `site_settings` à une liste blanche.
--
-- CONSTAT (2026-08-26)
-- Deux politiques PERMISSIVE en SELECT ouvraient la table en grand :
--   - `site_settings_read_all`      (rôle public,           USING true)
--   - `site_settings public read`   (anon, authenticated,   USING true)
-- Étant PERMISSIVE, elles s'additionnent : n'importe qui disposant de la clé
-- publiable — laquelle est embarquée dans le bundle navigateur, donc publique
-- par conception — pouvait lire TOUTE la table. Vérifié : requête REST anonyme
-- renvoyant les 4 secrets d'intégration chiffrés (mailchimp_api_key,
-- meta_capi_token, ga4_api_secret, cloudflare_api_token), en plus de la
-- configuration interne du site (emails de contact, paramètres de campagne...).
--
-- Le chiffrement AES-256-GCM (lib/encryption.ts) empêche l'exploitation directe
-- des secrets, mais diffuser publiquement leurs ciphertexts et la configuration
-- du site n'a pas lieu d'être : seules 5 clés sont réellement lues côté client.
--
-- SANS EFFET SUR LE BACK-END
-- Le rôle `service_role` porte l'attribut `rolbypassrls` (vérifié) : les
-- politiques RLS ne s'appliquent jamais aux appels effectués avec la clé
-- secrète (lib/supabase.ts > getSupabaseAdmin). Toutes les lectures serveur —
-- lib/integration-settings.ts, lib/campaign.ts, lib/promo-preview.ts, routes
-- app/api/** — sont donc inchangées.
--
-- Les politiques INSERT et UPDATE sont laissées en l'état : elles vérifient
-- déjà `auth.role() = 'service_role'` en WITH CHECK / USING.
-- ============================================================================

begin;

drop policy if exists "site_settings_read_all" on public.site_settings;
drop policy if exists "site_settings public read" on public.site_settings;

-- Liste blanche — relevé exhaustif des lectures faites avec la clé publiable :
--   logo_url          components/navbar.tsx, components/footer.tsx,
--                     app/admin/branding/page.tsx
--   logo_dark_url     app/admin/branding/page.tsx
--   favicon_url       app/admin/branding/page.tsx
--   site_name         app/admin/branding/page.tsx
--   maintenance_mode  middleware.ts (appel REST direct, avant authentification)
--
-- Toute nouvelle clé à lire côté navigateur doit être ajoutée ici, sans quoi la
-- requête renverra un tableau vide plutôt qu'une erreur — panne silencieuse.
create policy "site_settings_public_read_whitelist"
  on public.site_settings
  for select
  to anon, authenticated
  using (
    key in (
      'logo_url',
      'logo_dark_url',
      'favicon_url',
      'site_name',
      'maintenance_mode'
    )
  );

commit;

-- ============================================================================
-- VÉRIFICATION (à exécuter avec la clé publiable, pas depuis le SQL Editor qui
-- se connecte en rôle privilégié) :
--
--   curl "$SUPABASE_URL/rest/v1/site_settings?select=key&key=eq.logo_url" \
--        -H "apikey: $PUB" -H "Authorization: Bearer $PUB"
--   -> 1 ligne
--
--   curl "$SUPABASE_URL/rest/v1/site_settings?select=key&key=eq.mailchimp_api_key" \
--        -H "apikey: $PUB" -H "Authorization: Bearer $PUB"
--   -> [] (tableau vide)
-- ============================================================================
