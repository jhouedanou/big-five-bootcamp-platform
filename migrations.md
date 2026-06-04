# Migrations à exécuter (Supabase SQL Editor)

Ordre d'exécution = **ordre numérique des préfixes de fichier** (`01_` → `08_`).
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

## Règle simple

- **#1 obligatoirement en premier** : crée `set_updated_at()` + `analytics_events` + `profiles` (réutilisés partout).
- Ensuite **#2**, puis le reste dans l'ordre numérique.
- Dépendances clés : **#4 après #3** · **#6 après #5** · **#8 après #2**.
- **#4** : nécessaire seulement si #3 a déjà été exécutée avec `payment_product_id = null`
  (le seed de #3 contient désormais les IDs ; sur une base fraîche #4 est sans effet).
- Vérifier après chaque migration : aucune erreur rouge, tables/colonnes visibles dans le Table Editor.

## Migrations antérieures (déjà déployées, hors séquence)

Trackées dans git, appliquées avant ce lot — ne pas renommer :
`20260522_admin_payment_totals.sql`, `20260524_campaigns_rls.sql`,
`20260524_campaigns_rls_authenticated.sql`, `20260603_admin_payment_totals_coalesce.sql`,
`20260603_users_license_key.sql`.
