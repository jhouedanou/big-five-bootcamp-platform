# Plan — Étude BIG FIVE × LAVEIYE : 6 chantiers (branche `seo`)

## Contexte

6 briefs reçus + prototype HTML validé (1,6 Mo, images de l'étude embarquées en base64). Objectif : lancer la campagne de téléchargement de l'étude « Comment les marques en Afrique francophone communiquent ? — Tome 1 : Finance » (deadline : mois d'août), corriger le module vidéo (bloquant), compléter le tracking, et préparer l'IA générative.

Ajout post-réunion équipe Laveiye : **chantier G — section Commentaires** remplaçant « Analyse » et « Comment s'en servir » sous les campagnes, demandé pour le prochain chargement de campagnes (fin de semaine). Traité en Phase 0bis, avant la landing.

Décisions utilisateur validées :
- **Tracking** : étendre la stack code existante (gtag + Pixel + CAPI), **pas de GTM**.
- **Provider image IA** : option gratuite → **Gemini API free tier** (`gemini-2.5-flash-image`, clé AI Studio gratuite, quotas limités) derrière une abstraction provider.
- **URL landing** : `/etudes/finance` (pattern `/etudes/[slug]` extensible).
- **Accès IA** : Premium seulement + quota/jour.
- **Commentaires** : build natif sur Supabase, **pas Disqus** (justification en Phase 0bis).

## ⚠️ Actions hors code — AVANT TOUT

> Ce dépôt est **public**. Les deux premiers points portent sur des identifiants
> et ne sont volontairement pas détaillés ici — voir le fil email interne
> correspondant et `SECURITY_AUDIT.md`.

1. **Rotation d'un token d'API publicitaire** transmis en clair dans un document de brief. Régénérer côté fournisseur et mettre à jour la variable d'environnement Vercel correspondante.
2. **Sécuriser un compte analytics partagé** : identifiants diffusés par email et second facteur désactivé. Changer le mot de passe, réactiver la double authentification, inventorier les services qui en dépendent. Pour les accès partagés, utiliser un gestionnaire de mots de passe, pas l'email.
3. Obtenir le **PDF final de l'étude** auprès de l'équipe.
4. Créer une clé **Gemini API** (AI Studio, gratuite) → `GEMINI_API_KEY` Vercel (chantier F).
5. **Réponses complètes de Franck sur le brief commentaires** (le fil transmis est tronqué) — bloquant pour figer le périmètre du chantier G.

---

## Phase 0 — Fix vidéos P1 : mode démo AdminContext (BLOQUANT)

> **État : livré, build vert.** Le déclencheur exact du bug a été reproduit puis
> vérifié corrigé : `GET /api/admin/campaigns` sans session répond
> `401 {"error":"Unauthorized"}`, ce qui basculait tout l'admin en mode démo.
> Désormais : toast « Session expirée », liste vide, `isUsingLocalData` reste `false`.
> Ajouts non prévus au plan initial mais nécessaires : les mutations renvoient un
> booléen (le dialogue se fermait et perdait la saisie même sur échec), la
> suppression en masse compte les vrais succès, l'API remonte le code Postgres,
> et `drive` a été ajouté à la map de plateformes du formulaire (une URL Drive
> valide s'affichait « Plateforme non reconnue »).

**Problème** (confirmé par exploration) : [AdminContext.tsx:440-501](app/admin/AdminContext.tsx) — `addCampaign` traite **toute** erreur API (401 session expirée, 400 validation, 500 RLS) comme « table campaigns absente », latch `isUsingLocalData=true`, puis toutes les écritures suivantes sont silencieusement locales avec toasts succès. Aussi : catch de `loadCampaignsFromSupabase` (:397-402) injecte les 6 campagnes sample sans poser le flag ; `updateCampaign`/`deleteCampaign` avalent les erreurs avec toast succès.

**Fix** ([app/admin/AdminContext.tsx](app/admin/AdminContext.tsx)) :
- Discriminer les erreurs : 401 → toast « session expirée, reconnectez-vous » ; 400/500 → toast d'erreur avec le message serveur ; ne **jamais** conclure « table absente » sauf erreur Postgres `42P01` explicite.
- Supprimer le mode démo en production (garder derrière `NEXT_PUBLIC_ADMIN_DEMO=true` pour dev éventuel) ; plus aucun sample data ni toast « ajouté localement ».
- `updateCampaign`/`deleteCampaign` : remonter l'échec réel, pas de toast succès sur écriture non persistée.
- Bonus P2 partiel : supprimer la checkbox `isVideo` (aucune colonne DB, dérivée `!!video_url` — source de vérité unique, pas de migration).

**Vérif** : ajout campagne vidéo avec Drive URL → ligne visible dans Supabase ; simuler 401 (cookie effacé) → erreur claire, pas de faux succès.

---

## Phase 0bis — Chantier G : section Commentaires (URGENT, demandé pour « fin de semaine »)

> **État : code livré, build vert.** Reste à exécuter `supabase/migrations/11_20260812_campaign_comments.sql`
> dans le SQL Editor Supabase — sans elle les routes répondent en erreur (table absente).
> Périmètre livré : v1 complète (publication, édition/suppression par l'auteur, signalement,
> file de modération admin, épinglage, réponse officielle auto pour les admins, notification admin).
> Non livré : fils imbriqués et validation avant publication (restent des options).

Remplacer les sections « Analyse » et « Comment s'en servir » sous les campagnes par une section Commentaires réservée aux utilisateurs connectés.

### Décision outil : build natif, pas Disqus

Disqus ne remplit pas l'exigence « uniquement les utilisateurs connectés ». Son SSO (seul moyen de lier un commentaire au compte Laveiye) est réservé au plan Business, bien au-dessus des 18 $/mois du plan Plus. À 18 $/mois, l'utilisateur commente avec un compte Disqus/Google/Facebook tiers : friction d'inscription, aucun lien avec le statut Premium, aucune donnée exploitable côté admin, embed tiers chargeant ses propres traqueurs (conflit direct avec le RGPD de la Phase 4).

Le build natif est peu coûteux ici parce que **tout l'échafaudage existe déjà** :
- Table `reactions` (like/dislike campagne) = template exact : `UNIQUE(user_id, campaign_id)`, RLS `select authenticated / insert-update-delete own / service_role ALL`, route [app/api/reactions/[campaignId]/route.ts](app/api/reactions/[campaignId]/route.ts) (client service-role + `Authorization: Bearer` → `auth.getUser(token)`).
- Table `notifications` + fonction SQL `create_notification()` + pattern d'insert best-effort ([app/api/favorites/route.ts:214-233](app/api/favorites/route.ts)) + cloche [notification-bell.tsx](components/notifications/notification-bell.tsx).
- Garde admin `checkAdmin` ([lib/admin-auth.ts:58](lib/admin-auth.ts)), trigger `set_updated_at()` déjà en base.

### ⚠️ Ne pas supprimer `analyse` / `how_to_use`

Réponse à la question « archivage ou suppression définitive » : **archivage obligatoire**, pour deux raisons factuelles.

1. Ces deux colonnes alimentent le générateur IA — `SOURCE_TEXT_COLUMNS` ([app/actions/campaign-generator.ts:27](app/actions/campaign-generator.ts)) et [lib/groq-campaign.ts:57](lib/groq-campaign.ts). Les supprimer casse le chantier F et le générateur existant.
2. Ce sont des **champs premium** : `PREMIUM_FIELDS` ([lib/content-access.ts:38](lib/content-access.ts)) les masque aux non-premium, et les migrations RLS ([20260524_campaigns_rls.sql:57](supabase/migrations/20260524_campaigns_rls.sql)) révoquent le GRANT colonne pour `anon` **et** `authenticated`. C'est une partie de la valeur payante de la plateforme.

Le retrait est donc **UI seulement** : masquer l'onglet « Analyse stratégique » sur la page détail ([content-detail-client.tsx:1078-1152](app/content/[id]/content-detail-client.tsx)), garder les colonnes, l'édition admin ([admin/campaigns/page.tsx:1789-1810](app/admin/campaigns/page.tsx)) et l'import CSV intacts. Réversible en une ligne. À confirmer : les masquer aussi côté admin, ou l'équipe continue-t-elle à les remplir pour l'IA ?

### Périmètre v1 (à figer — les réponses de Franck sont tronquées dans le fil reçu)

Hypothèses de travail, à valider :
- Commentaires **à plat** (pas de fil imbriqué) + une réponse admin « officielle » mise en avant.
- Tous les utilisateurs connectés commentent ; l'auteur peut modifier/supprimer le sien.
- Texte simple, ~1500 caractères, pas d'images ni HTML (échappement strict).
- Modération **a posteriori** : bouton « Signaler » + file admin, pas de validation avant publication.
- Admin : épingler, masquer, supprimer.
- Tri plus récents d'abord, « charger plus » par 20.
- Notification in-app à l'admin sur nouveau commentaire et à l'auteur sur réponse officielle.

### Fichiers

Nouveaux :
- `supabase/migrations/11_20260812_campaign_comments.sql`
- `app/api/comments/[campaignId]/route.ts` (GET paginé, POST) — calqué sur la route reactions
- `app/api/comments/[id]/route.ts` (PATCH edit, DELETE)
- `app/api/comments/[id]/report/route.ts`
- `app/api/admin/comments/route.ts` (file de modération + actions pin/hide/delete)
- `components/comments/comments-section.tsx`, `comment-item.tsx`, `comment-form.tsx`
- `app/admin/commentaires/page.tsx`

Modifiés : [content-detail-client.tsx](app/content/[id]/content-detail-client.tsx) (retrait onglet Analyse, montage de la section sous `ReactionButtons` au niveau `:1330-1345`), sidebar admin, `migrations.md`.

### Migration `11_20260812_campaign_comments.sql`

- `campaign_comments(id, campaign_id fk campaigns, user_id fk auth.users, body text, is_official bool, is_pinned bool, is_hidden bool, hidden_reason, edited_at, created_at, updated_at)` — index `(campaign_id, created_at desc)`, trigger `set_updated_at()`.
- `comment_reports(id, comment_id fk, reporter_user_id, reason, status open|reviewed|dismissed, created_at)`.
- RLS : forme `reactions` — select `authenticated` sur les non masqués, insert/update/delete own, `service_role` ALL, + policy admin read-all (forme `add-favorites-table.sql`).

**Affichage auteur** : `users.name` + `avatar_url`. Attention, `avatar_url` peut ne pas exister en base ([app/api/avatars/route.ts:32-51](app/api/avatars/route.ts) l'entoure d'un try/catch) → fallback initiales. La jointure auteur cross-user doit passer par le **service role** côté serveur, `profiles` étant en RLS select-own.

### Estimation

| Périmètre | Charge | Livrable |
|---|---|---|
| **v1 minimal** — commentaires à plat, poster/éditer/supprimer le sien, admin supprime, retrait onglet Analyse | **2 à 3 j** | Tenable pour « fin de semaine » **si le périmètre est figé immédiatement** |
| **v1 complète** — + signalement, file de modération admin, épingler/masquer, réponse officielle, notifications | **5 à 6 j** | Semaine suivante |
| Option **fils imbriqués** (1 niveau) | +1 à 1,5 j | |
| Option **validation avant publication** | +1,5 j | Change le modèle : file d'attente + statut, aucun commentaire visible sans passage admin |

Réponse à donner à Franck : oui pour un chargement de campagnes en fin de semaine, **en v1 minimal et à périmètre gelé** ; la modération complète suit la semaine d'après. Le vrai risque de calendrier n'est pas le code, c'est le fil de brief tronqué — surtout le choix modération a priori vs a posteriori, qui change l'architecture.

### Vérif

Utilisateur connecté poste → visible immédiatement ; déconnecté → lecture seule + invite à se connecter ; auteur édite/supprime le sien, pas celui d'un autre (tester via appel API direct, pas seulement l'UI) ; admin masque → disparaît du front ; signalement → apparaît dans la file admin ; XSS : poster `<script>` et vérifier l'échappement ; onglet Analyse absent du front mais colonnes toujours peuplées en base et générateur IA fonctionnel.

---

## Phase 1 — Landing page `/etudes/finance` + capture leads (chantier A + C-schéma)

> **État : livré, build vert, vérifié en navigateur.** Page publique et indexable
> (aucun `X-Robots-Tag`, présente au sitemap), zéro défilement horizontal à 320 px,
> modale conforme au brief (4 champs obligatoires, 2 optionnels, consentement,
> honeypot hors parcours clavier), carrousel 4 pages fonctionnel.
> Visuels extraits du prototype : 1 Mo de PNG base64 → 292 Ko de WebP
> (`scripts/extract-etude-assets.mjs`, rejouable).
> Reste : exécuter la migration 12, déposer le PDF dans le bucket `studies` puis
> renseigner `studies.file_path`. Tant que `file_path` est `null`, le lead est
> capturé et l'email annonce un envoi à venir — la campagne peut démarrer sans le PDF.

### Assets
- Extraire les images base64 du prototype (`~/Downloads/prototype_landing_page_bigfive_etude_laveiye.html`) : cover + Préambule + Sommaire + Contenu UBA → WebP optimisés dans `public/etudes/finance/`.
- PDF étude → bucket Supabase **privé** `studies` (jamais d'URL publique directe).

### Page (nouvelle route publique)
- `app/etudes/finance/page.tsx` — Server Component, metadata SEO complètes (title, description, OG = cover).
- `app/etudes/finance/study-landing-client.tsx` — carrousel 4 pages (flèches + 4 points), FAQ 2 accordéons indépendants, modale formulaire partagée par les 2 CTA (fermeture croix/clic extérieur, scroll préservé).
- Fidèle au prototype : header logo centré, hero 2 colonnes (texte + mockup livre 3D), 5 bénéfices coche blanche/cercle noir, rappel CTA, footer noir copyright seul. Charte : blanc/noir/gris, dégradé violet→bleu CTA. Mobile : empilement vertical, zéro scroll horizontal.
- Capture UTM (`utm_source/medium/campaign/content` + `document.referrer`) → hidden fields.

### API + email
- `app/api/etudes/lead/route.ts` — modèle [app/api/contact/route.ts](app/api/contact/route.ts) : `rateLimit` ([lib/rate-limit.ts](lib/rate-limit.ts)), honeypot, validation zod, insert `study_leads`. Doublon (unique violation `23505`) → 409 « Cette adresse email est déjà enregistrée pour cette étude. »
- `lib/study-emails.ts` — email de livraison via [lib/gmail-sender.ts](lib/gmail-sender.ts) (modèle [lib/webinar-emails.ts](lib/webinar-emails.ts)) avec lien de téléchargement.
- `app/api/etudes/download/route.ts` — `GET ?token=` : valide le token du lead, génère un lien signé Supabase, incrémente `download_count`, marque `downloaded_at`.

### Middleware + SEO
- [middleware.ts](middleware.ts) : `/etudes` à **exclure du noindex** (`shouldNoIndexPath`) — page indexable ; pas dans la liste auth. Ajouter au sitemap ([app/sitemap.ts](app/sitemap.ts)).

### Migration `supabase/migrations/12_20260812_studies.sql` (+ `migrations.md`)
- `studies` : `id, slug, title, file_path, is_active, created_at`
- `study_leads` : `id, study_id fk, first_name, last_name, email, phone, company, job_title, consent bool + consented_at, utm_source, utm_medium, utm_campaign, utm_content, referrer, download_token uuid, downloaded_at, download_count, created_at` — **unique `(study_id, email)`**. RLS : aucune lecture publique ; écriture via service role uniquement.

### Tracking funnel (alimente Phase 3)
`trackClientEvent` ([lib/analytics.ts](lib/analytics.ts), accepte anonyme) : `study_page_view`, `study_form_open`, `study_form_start` (1er champ rempli), `study_form_submit`, `study_download`.

**Vérif** : soumission → ligne en base + email reçu + PDF téléchargeable ; doublon → message exact ; UTM en base via `?utm_source=laveiye…` ; `curl -I` sans `X-Robots-Tag: noindex` ; mobile 320 px sans débordement.

---

## Phase 2 — Bannière étude dashboard (chantier B)

**Approche** : ne pas réutiliser `promo_campaigns` (schéma orienté offres payantes, aucun CRUD admin). Nouvelle table `dashboard_banners` + admin CRUD sur le modèle Temps-Forts ([app/admin/temps-forts](app/admin/temps-forts), [lib/temps-forts-server.ts](lib/temps-forts-server.ts)) — déjà admin-éditable, bon template.

- Migration `13_20260812_dashboard_banners.sql` : `dashboard_banners(id, title, body, cta_label, image_url, link_url, utm_source, utm_medium, utm_campaign, utm_content, starts_at, ends_at, is_active, sort_order, timestamps)`. RLS : select authenticated (actives + dans fenêtre de dates), write admin.
- Admin : `app/admin/bannieres/page.tsx` (+ entrée sidebar). Visuel : champ URL en V1 (bannière fournie par graphiste), upload via [app/api/upload/route.ts](app/api/upload/route.ts) possible.
- Front : nouveau type de slide `banner` dans [promo-temps-forts-carousel.tsx](components/promo/promo-temps-forts-carousel.tsx) (slides `tf|promo|banner`). Slide entièrement cliquable → nouvel onglet, lien + UTM depuis la base (défauts brief : `utm_source=laveiye&utm_medium=banner&utm_campaign=etude_big_five&utm_content=banniere_telechargement`).
- Events : `banner_impression` (IntersectionObserver au 1er affichage visible) + `banner_click` → `analytics_events`.

**Vérif** : création bannière en admin → visible dashboard sans déploiement ; dates passées/désactivée → disparaît ; clic → landing nouvel onglet avec les 4 UTM ; events en base.

---

## Phase 3 — Dashboard admin leads + export (chantier C-suite)

- `app/admin/etudes/page.tsx` (guard [lib/admin-auth.ts](lib/admin-auth.ts) `checkAdmin`) : KPIs (visites `study_page_view`, formulaires commencés `study_form_open`, soumis = count leads, téléchargements, taux de conversion clic bannière → lead), filtres source/étude/période, table contacts paginée.
- `app/api/admin/etudes/leads/route.ts` (liste filtrée) + `app/api/admin/etudes/export/route.ts` — copie exacte du pattern [app/api/admin/users/export/route.ts](app/api/admin/users/export/route.ts) (BOM UTF-8, `csvEscape`, batché 1000).
- Agrégats `analytics_events` : requêtes groupées par `event_name` + `metadata->>utm_source` + période ; index `(event_name, created_at)` si absent (à inclure dans migration 11).
- Afficher les visites comme « approximatives » (adblockers).

**Vérif** : KPIs = comptes SQL manuels ; CSV ouvert dans Excel avec accents OK ; filtres cohérents.

---

## Phase 4 — Événements tracking (chantier D, sans GTM)

- `lib/tracking-events.ts` : helpers typés fan-out GA4 (gtag client + [lib/ga4-mp.ts](lib/ga4-mp.ts) serveur) / Meta Pixel ([lib/fb-pixel.ts](lib/fb-pixel.ts), consent-gated) / CAPI ([lib/fb-capi.ts](lib/fb-capi.ts)).
- Étendre `lib/fb-capi.ts` : ajouter `Lead` aux événements autorisés (actuels : CompleteRegistration/InitiateCheckout/Purchase), `event_id` partagé Pixel/CAPI pour dédup.
- Brancher les événements manquants du brief : `Lead` (formulaire étude + contact/démo), `Sign Up` (création compte), `Email Verified` (confirmation), `Search` (compléter l'existant [app/dashboard/page.tsx:968](app/dashboard/page.tsx)). `PageView`, `CompleteRegistration`, `InitiateCheckout`, `Purchase` existent déjà.
- Externaliser `G-H34KN567Q2` hardcodé ([app/layout.tsx:6](app/layout.tsx)) → `NEXT_PUBLIC_GA_ID`.
- RGPD : tout event Meta (client ET serveur) reste conditionné au consentement existant (`laveiye-rgpd-consent-v1`).

**Vérif** : GA4 DebugView + Meta Events Manager Test Events — chaque event une fois (dédup OK), rien sans consentement.

---

## Phase 5 — Vidéos P2/P3/P4 (chantier E-suite)

**P2 — lecture cohérente** :
- [content-detail-client.tsx:984-1075](app/content/[id]/content-detail-client.tsx) : `video_url` présent → **toujours lecteur interne**, quel que soit `platforms[0]` ; `publication_url` → uniquement bouton « Voir la publication d'origine ».
- [video-modal.tsx:36](components/video-modal.tsx) : supprimer le timeout 4,5 s → `window.open` automatique ; remplacer par lien de secours manuel « Ouvrir sur … ». Documenter : fichiers Drive à partager « toute personne disposant du lien ».
- Ajouter `drive` (+ `instagram`, `tiktok` manquants) aux maps plateformes : [content-card.tsx:306-319](components/dashboard/content-card.tsx), [admin campaigns page.tsx:1705-1713](app/admin/campaigns/page.tsx).

**P3 — miniature auto Drive** : [lib/video-utils.ts:374](lib/video-utils.ts) `getVideoInfo` → pour drive, retourner `https://drive.google.com/thumbnail?id=<ID>&sz=w800`. Cascade : image manuelle > thumbnail Drive (`onError` → placeholder) > placeholder. Réponse à la question du brief : **oui, techniquement possible** pour fichiers Drive publics.

**P4 — hover preview** : câbler `VideoUploadButton` (bucket `videos`, [app/api/upload/video/route.ts](app/api/upload/video/route.ts)) dans le formulaire admin principal (aujourd'hui seulement dans le legacy creative-form). Preview `<video muted autoPlay loop playsInline>` au hover desktop, **uniquement mp4 bucket** (iframe Drive : autoplay muet non fiable). Mobile : 1er tap = preview, 2e tap = navigation (la carte est un `Link`).

**Vérif** : Drive public → lecture inline sans redirection ; Drive privé → message clair ; badge « Drive » partout ; miniature auto sans upload ; hover fluide, silencieux.

---

## Phase 6 — IA générative 2 agents (chantier F)

**Provider** : Gemini free tier — `gemini-2.5-flash-image` (clé AI Studio gratuite). ⚠️ Quotas gratuits faibles (~qq dizaines d'images/jour) → cohérent avec accès Premium + quota utilisateur ; abstraction `lib/image-gen.ts` pour swapper vers un tier payant ensuite.

**Architecture** :
1. Page `app/studio-pub/page.tsx` (Premium only : `useRequireActiveSubscription`, pattern [campaign-generator page.tsx:366](app/campaign-generator/page.tsx)). Formulaire unique : upload image référence (via [app/api/upload/route.ts](app/api/upload/route.ts), bucket `ad-references`) + 7 champs obligatoires (secteur, produit, cible, canal, ton, émotion, objectif) + 6 optionnels. **État « incomplet » = validation zod côté client** listant les manquants (champs connus, pas besoin d'appel IA).
2. `app/api/studio/generate/route.ts` (POST) : crée `ad_generations(status=pending)`, enchaîne **agent 1** (Groq vision `llama-4-scout`, pattern [lib/groq-campaign.ts](lib/groq-campaign.ts), prompt exact du brief : analyse 3 phrases + « L'objectif business réel est de… » + framework 2 phrases) → **agent 2** (Gemini image, brief synthétisé). `export const maxDuration = 120` minimum ; le client **poll** `GET /api/studio/generate/[id]` toutes les 3 s (schéma prêt pour l'asynchrone si timeout).
3. Résultat : image → bucket `ad-generations`, affichage image + analyse + framework, boutons télécharger/relancer. Erreur → message propre + statut `error`.
4. Quota : N générations/jour/user (compteur en base + [lib/rate-limit.ts](lib/rate-limit.ts)).

**Migration `14_20260812_ad_generations.sql`** : `ad_generations(id, user_id, reference_image_path, context jsonb, analysis_text, framework_text, result_image_path, status pending|processing|done|error, error_message, provider, created_at, completed_at)` — RLS owner select, insert serveur.

**Env** : `GEMINI_API_KEY` (Vercel + doc `.env.example` ; ajouter aussi `GROQ_API_KEY` à `.env.example`, absent aujourd'hui).

**Vérif** : parcours complet image test → analyse conforme, image < 90 s, relance OK, manquants listés, quota déclenché, Free user bloqué.

---

## Récap migrations (→ `migrations.md`)
Dernière migration trackée = `10_20260623_admin_users_security_invoker.sql`, donc la suite démarre à `11_`.

| Fichier | Tables | Phase |
|---|---|---|
| `11_20260812_campaign_comments.sql` | `campaign_comments`, `comment_reports` | 0bis |
| `12_20260812_studies.sql` | `studies`, `study_leads`, index `analytics_events(event_name, created_at)` | 1 |
| `13_20260812_dashboard_banners.sql` | `dashboard_banners` | 2 |
| `14_20260812_ad_generations.sql` | `ad_generations` | 6 |

⚠️ Le schéma vivant de `notifications`, `reactions`, `favorites`, `collections` n'existe **que** dans un worktree obsolète (`.claude/worktrees/upbeat-murdock/scripts/*.sql`), pas dans `supabase/migrations/`. Ces tables tournent en production mais ne sont pas trackées proprement — à rapatrier, sinon une base fraîche part incomplète.

## Risques transverses
- Deux actions d'identifiants à traiter avant tout (voir « Actions hors code », détails hors dépôt).
- Chantier G : brief Franck tronqué → périmètre non figé. Le choix modération a priori / a posteriori change l'architecture, pas seulement la charge.
- Ne jamais supprimer `campaigns.analyse` / `campaigns.how_to_use` : champs premium + sources du générateur IA (chantier F).
- RGPD : consentement horodaté leads ; events Meta derrière consentement ; pas d'ajout auto newsletter.
- RLS : `study_leads`, `ad_generations` jamais lisibles publiquement.
- `middleware.ts` : deux listes distinctes (auth-skip, noindex) à mettre à jour ensemble pour `/etudes`.
- Gemini free tier : quotas → prévoir message « quota atteint, réessayez demain » propre.
- Perf landing : prototype 1,6 Mo → payload initial cible < 300 Ko (WebP + next/image).
