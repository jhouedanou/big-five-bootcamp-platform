# Migrations à exécuter (Supabase SQL Editor)

Ordre d'exécution = **ordre numérique des préfixes de fichier** (`01_` → `11_`).
Exécuter dans le **SQL Editor Supabase**, de haut en bas. Toutes idempotentes
(ré-exécutables sans casse si doute).

| # | Fichier | Contenu | Dépend de |
|---|---------|---------|-----------|
| 1 | `supabase/migrations/01_20260604_onboarding.sql` | Tables `profiles`, `sectors` (66 seedés), `profile_sectors`, `analytics_events` + fonction `set_updated_at()` + RLS | — |
| 2 | `supabase/migrations/02_20260604_admin_segmentation.sql` | Colonnes `users` (phone_number, last_login_at, access_type, user_status), tables `tags`/`user_tags`, vue `admin_users`, index | #1 (`profiles`, `set_updated_at`) |
| 3 | `supabase/migrations/03_20260605_promo.sql` | Tables `promo_campaigns`, `promo_offers` (seed), `user_popup_views` + RLS | #1 (`set_updated_at`) |
| 4 | `supabase/migrations/04_20260605_promo_product_ids.sql` | UPDATE `promo_offers.payment_product_id` (Chariow `prd_9ya1w161`, `prd_51tfnkip`) | #3 |
| 5 | `supabase/migrations/05_20260606_webinars.sql` | Tables `webinars`, `webinar_registrations` + index + RLS | #1 (`set_updated_at`) |
| 6 | `supabase/migrations/06_20260606_webinars_seed.sql` | Seed 2 webinaires publiés (#BigFiveDécrypte juillet + août 2026) | #5 |
| 7 | `supabase/migrations/07_20260607_analytics_page_url.sql` | Colonne `page_url` sur `analytics_events` | #1 (`analytics_events`) |
| 8 | `supabase/migrations/08_20260607_user_activity_access.sql` | `users.last_activity_at` + normalisation `access_type` en codes + vue `admin_users` (activity) | #2 (`admin_users`, colonnes users) |
| 9 | `supabase/migrations/09_20260612_admin_users_phone.sql` | Vue `admin_users` : `phone_number = coalesce(phone_e164, phone_number)` — fixe téléphone vide dans /admin/audience | #8 (vue `admin_users`) |
| 10 | `supabase/migrations/10_20260623_admin_users_security_invoker.sql` | Vue `admin_users` recréée en `security_invoker = on` (la vue applique la RLS de l'appelant). Postgres 15+ | #9 (vue `admin_users`) |
| 11 | `supabase/migrations/11_20260812_campaign_comments.sql` | Tables `campaign_comments`, `comment_reports` + index + RLS + GRANTs colonne (flags de modération réservés au serveur) | **aucune** — table `campaigns` uniquement |
| 12 | `supabase/migrations/12_20260812_studies.sql` | Tables `studies` (seed Tome 1 Finance), `study_leads` + bucket privé `studies` + RLS. Index de funnel sur `analytics_events` créé seulement si la table existe | **aucune** |

## Règle simple

- **#1 obligatoirement en premier** : crée `set_updated_at()` + `analytics_events` + `profiles` (réutilisés partout).
- Ensuite **#2**, puis le reste dans l'ordre numérique.
- Dépendances clés : **#4 après #3** · **#6 après #5** · **#8 après #2** · **#10 après #9**.
- **#11 et #12 sont autonomes** : elles redéfinissent elles-mêmes `set_updated_at()`
  (`create or replace`, définition identique à #1) et peuvent donc être exécutées
  seules sur une base où #1 n'a jamais tourné. Rejouer #1 ensuite ne casse rien.
- **#12** crée l'index de funnel sur `analytics_events` **seulement si la table
  existe**. Si elle est absente, la migration réussit avec un `NOTICE` : les
  études fonctionnent, mais les KPI de `/admin/etudes` nécessiteront #1.
- **#12** ensuite : Elle crée le bucket privé `studies` mais laisse
  `studies.file_path` à `null` : la landing `/etudes/finance` et la capture de leads
  fonctionnent immédiatement, l'email annonçant un envoi à venir. Pour activer le
  téléchargement, déposer le PDF dans le bucket puis
  `update public.studies set file_path = 'finance/<fichier>.pdf' where slug = 'finance';`
- **#4** : nécessaire seulement si #3 a déjà été exécutée avec `payment_product_id = null`
  (le seed de #3 contient désormais les IDs ; sur une base fraîche #4 est sans effet).
- Vérifier après chaque migration : aucune erreur rouge, tables/colonnes visibles dans le Table Editor.

## Migrations antérieures (déjà déployées, hors séquence)

Trackées dans git, appliquées avant ce lot — ne pas renommer :
`20260522_admin_payment_totals.sql`, `20260524_campaigns_rls.sql`,
`20260524_campaigns_rls_authenticated.sql`, `20260603_admin_payment_totals_coalesce.sql`,
`20260603_users_license_key.sql`.
