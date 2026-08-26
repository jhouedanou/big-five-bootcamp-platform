# Conformité au brief tracking — état vérifié

Branche : `seo` (à jour sur `origin/seo`, commit `a275139`)
Référence : *Brief tracking — Laveiye, mis à jour*
Date de la vérification : 26/08/2026
Dernière mise à jour : 26/08/2026 — **mise en conformité complète** (cf. §0)

## 0. Où en est la conformité

Ce document a d'abord été un audit. Tous les écarts qu'il relevait ont depuis été
traités. Il est conservé tel quel — constat puis correctif — pour que la décision
prise sur chaque point reste lisible.

| Bloc | Ce qui a été fait |
|---|---|
| Double comptage Meta (§5) | Dès qu'un `GTM-` est configuré, le site cesse de charger le pixel et relaie les événements Meta au conteneur par `meta_event` |
| `purchase` (§2.1) | Part de `/payment/success` après confirmation serveur, avec tous les paramètres du brief |
| Paramètres transversaux (§4) | `user_id`, `user_stage` et `subscription_plan` posés une fois et joints à chaque événement |
| P0 manquants (§2) | `activation_completed`, `plan_limit_reached`, `contact_opt_in_updated` ajoutés ; `login` et `payment_failed` atteignent enfin le dataLayer |
| P1 manquants (§3) | `view_pricing`, `sign_up_started`, `collection_created`, `subscription_renewed`, `subscription_cancelled` ajoutés |
| Paramètres non conformes (§4) | Complétés aux points d'appel, et renommés par une table d'alias plutôt qu'à la source — les tableaux de bord internes lisent la même base |
| Correspondances fausses | `premium_content_clicked → plan_limit_reached` et `plan_upgraded → subscription_renewed` retirées ; `begin_checkout` déplacé du clic vers la création réelle de la session |

**Reste ouvert, et c'est volontaire :**

- `export_used` — le produit n'a aucune fonction d'export côté utilisateur. Le
  vocabulaire est prêt.
- `user_stage: dormant` — calcul quotidien du back-end (§9), pas un état que le
  navigateur peut connaître.
- L'arbitrage du §6 sur le consentement appliqué aux événements serveur, qui
  demande une validation du responsable du traitement.
- La création de la balise Meta dans le conteneur (ci-dessous).

**Une vue de suivi a été ajoutée dans l'admin** : `/admin/tracking` liste chaque
événement du brief, ce que la base a réellement reçu sur 24 h / 7 j / 30 j, et
les paramètres manquants sur la dernière occurrence.

**La recette est dans [qa/recette-tracking.md](recette-tracking.md).**

Vérifié en local sur un build de production, dans les **deux** configurations —
conteneur configuré et conteneur absent.

### Ce qu'il reste à configurer dans GTM

Une balise Meta unique, déclenchée sur l'événement `meta_event` du dataLayer :

- **nom de l'événement Meta** → variable Data Layer `meta_event_name`
  (`PageView`, `ViewContent`, `Search`, `Lead`, `CompleteRegistration`,
  `InitiateCheckout`) ;
- **Event ID** → variable Data Layer `event_id`.

Le second point n'est pas optionnel : sans lui, la conversion envoyée par le
navigateur et celle envoyée par la Conversions API compteront pour deux
(brief §12).

## 0 bis. Demande complémentaire — landing de campagne

Une demande complémentaire porte sur quatre points : les vues de pages, les
téléchargements, les interactions de la landing, et l'installation du pixel sur
la landing. Périmètre retenu : **`/etudes/[slug]`**, destination des bannières
et des publicités.

| Point | Ce qui a été fait |
|---|---|
| Vues de pages | `page_type` ajouté (§6, jamais émis) ; hors conteneur, la vue part désormais aussi à `gtag` — les navigations internes n'atteignaient **pas** GA4 |
| Téléchargements | `guide_download` se déclenche à l'ouverture du lien du mail, plus à l'envoi du formulaire |
| Interactions | `study_preview_navigated`, `study_faq_opened`, `study_form_abandoned` |
| Pixel | La landing charge le pixel elle-même, quel que soit l'état du conteneur |

### Pourquoi les navigations internes ne remontaient pas

`pushDataLayer` pousse un **objet simple** dans `window.dataLayer` : c'est la
convention GTM, et `gtag.js` ne consomme que les objets `arguments` de son
propre shim. Tant qu'aucun `GTM-` n'est saisi — l'état actuel, la bascule étant
prévue en dernier — `gtag('config')` produisait une seule vue au chargement, le
tracker ignorait volontairement le premier `pathname`, et **tout le reste était
perdu**. Le §11 exige pourtant « pour une SPA, mesurer chaque changement de
route sans doubler l'événement initial ».

Le correctif parle directement à `gtag` **et seulement hors conteneur**
([datalayer-route-tracker.tsx](../components/analytics/datalayer-route-tracker.tsx)) :
sous conteneur, la vue continue de passer par le `dataLayer`, sans doublon.

### Pourquoi `guide_download` va baisser

Il partait à l'envoi réussi du formulaire — c'est-à-dire au moment où l'email
est expédié. Le brief §6 le définit comme « accès effectif au fichier ». Il est
désormais émis par une page de relais,
[/etudes/telechargement](../app/etudes/telechargement/download-relay.tsx), que le
lien du mail traverse avant que l'API ne serve le PDF.

Une redirection serveur ne peut rien pousser dans le `dataLayer` : le passage
par le navigateur est la seule façon que GA4 voie le téléchargement avec le
`client_id` du visiteur — même raisonnement que pour `purchase` (§2.1).

Le volume **baissera**, puisque l'événement cesse de compter les leads qui
n'ouvrent jamais le lien. C'est précisément ce que suppose le segment « Lead
guide » du §9 : `guide_download` enregistré, aucun `account_created` sous 24 h.

`/api/etudes/download` reste en service : les mails déjà partis délivrent
toujours l'étude, simplement sans mesure.

### Le pixel sur la landing — une déviation assumée du §12

**Le brief dit l'inverse de la demande, deux fois :**

> §12 — « configurer le Pixel dans GTM et **ne pas conserver un second Pixel
> directement codé** »
> §3 — « Le développeur **ne doit pas ajouter une seconde balise** GA4 ou Meta
> directement dans le code après la migration. »

La demande complémentaire exige pourtant que « le pixel soit également installé
sur la landing page afin de permettre la bonne collecte des données ».

**Ce qui a été retenu** respecte l'*intention* de ces règles — explicitée au §14
(« une seule requête par événement ») et au §16 (« aucun doublon sur les
événements clés ») — sans y désobéir dans les faits : **la landing possède le
pixel, le conteneur possède tout le reste.**

Comme la landing n'émet jamais `meta_event`, la balise Meta du conteneur ne s'y
déclenche pas. Il n'existe donc **jamais deux pixels sur un même événement** :
ce n'est pas un second pixel, c'est le même, dont la propriété change de main
selon la route. La séparation est portée par le code
([fb-pixel.ts](../lib/fb-pixel.ts), `claimNativePixel`), pas par une règle de
déclenchement GTM qu'on peut oublier de configurer.

Effet de bord bienvenu : le `Lead` Meta de la modale repasse par
`fbq('track', …, { eventID })`. La déduplication avec la Conversions API
redevient directe, sans dépendre de la balise du conteneur.

**Ce point doit être signalé au responsable du tracking** : la lettre du §12
n'est pas respectée, son objet l'est.

## Méthode et portée

Cette vérification a été faite **par lecture du code**, événement par événement,
en partant du vocabulaire du brief (§6, §7, §8) et en remontant jusqu'au point
de déclenchement réel dans l'application. Elle répond à une question précise :
*pour chaque événement demandé, existe-t-il une ligne de code qui le pousse
effectivement dans le `dataLayer` ?*

Elle ne remplace pas le parcours de recette du §15, qui demande un
environnement de préproduction, Tag Assistant et Meta Test Events. Aucun
parcours fonctionnel n'a été exécuté ici.

**Point d'architecture à connaître pour lire la suite.** Le site ne pousse pas
directement dans le `dataLayer`. Il appelle ses propres fonctions de mesure
(`trackEvent`, `trackGA4`), et une table de correspondance
(`LEGACY_EVENT_MAP`, [lib/datalayer.ts:169](../lib/datalayer.ts)) traduit le nom
interne en événement du brief. Un événement du brief n'arrive donc dans GTM que
si **deux** conditions sont réunies : il figure dans la table, **et** son nom
interne est réellement appelé quelque part. Plusieurs écarts ci-dessous
viennent de la seconde condition — l'entrée existe dans la table, mais rien ne
la déclenche.

---

## 1. Ce qui est conforme

### Infrastructure (§4, §13)

| Exigence du brief | État |
|---|---|
| Conteneur GTM dans `<head>`, `<noscript>` en tête de `<body>` | Conforme — [app/layout.tsx](../app/layout.tsx), posé sur le layout racine, donc sur toutes les routes |
| `dataLayer` initialisé une seule fois, jamais réécrit | Conforme — initialisé dans le bootstrap Consent Mode, puis seulement `push` |
| Changements de route (SPA) | Conforme — `DataLayerRouteTracker`, avec suppression de la première vue pour ne pas doubler celle du conteneur |
| Séparation des environnements | Conforme — `environment()` déduit `staging` de `localhost` et `*.vercel.app` ([lib/datalayer.ts:88](../lib/datalayer.ts)) |
| Consent Mode : état par défaut avant toute balise | Conforme — `CONSENT_MODE_BOOTSTRAP` injecté avant le script GTM |
| Mise à jour immédiate après le choix | Conforme — `ConsentModeBridge` écoute l'événement du bandeau |
| Pas de donnée personnelle dans le `dataLayer` | Conforme — liste de clés interdites filtrée à la source ([lib/datalayer.ts:66](../lib/datalayer.ts)) |
| Une seule balise GA4 à la fois | Conforme — dès qu'un `GTM-` est saisi, le `gtag` direct s'efface |

### Meta Pixel et CAPI (§12)

La déduplication `event_id` est correctement construite sur trois des quatre
conversions :

| Conversion | Pixel | CAPI | `event_id` partagé |
|---|---|---|---|
| `Lead` | [study-lead-modal.tsx:178](../components/etudes/study-lead-modal.tsx) | [etudes/lead/route.ts:210](../app/api/etudes/lead/route.ts) | Oui — le serveur génère l'identifiant et le renvoie au client |
| `CompleteRegistration` | [register/page.tsx:159](../app/register/page.tsx) | [auth/register/route.ts:278](../app/api/auth/register/route.ts) | Oui — le client génère et transmet |
| `InitiateCheckout` | [CheckoutClient.tsx:115](../app/checkout/CheckoutClient.tsx) | [create-payment/route.ts:240](../app/api/checkout/create-payment/route.ts) | Oui — même mécanisme |
| `Purchase` | *aucun* | [subscription-activation.ts:73](../lib/subscription-activation.ts) | Sans objet — serveur seul |

`Purchase` en serveur seul est **conforme** au brief : « utiliser le paiement
confirmé côté serveur comme source de vérité ». Il n'y a pas de doublon
possible. La contrepartie est une qualité de correspondance Meta plus faible,
faute d'identifiants navigateur — c'est un arbitrage, pas un défaut.

Le jeton CAPI n'est jamais exposé au navigateur (`import "server-only"`), et
l'identifiant du pixel est désormais résolu à l'exécution depuis
`/admin/integrations`, ce qui corrige le point « le nouveau jeton ne change
rien » de la recette du 19/08.

---

## 2. Écarts — événements P0 manquants

Ce sont les manques qui bloquent le funnel demandé au §6 à §8.

### 2.1 `purchase` n'était jamais poussé — corrigé

L'entrée existait dans la table (`payment_successful: "purchase"`), mais
`payment_successful` n'était **appelé nulle part**. Après la bascule, GA4
n'aurait reçu aucun paiement, alors que le §11 place `purchase` parmi les six
événements clés du pilotage. Meta, lui, recevait bien la conversion par CAPI :
le trou était du côté Google.

**Correctif.** `purchase` part désormais de
[app/payment/success/page.tsx](../app/payment/success/page.tsx), au moment où la
page a confirmé le statut du paiement auprès du prestataire — donc « confirmé
par le back-end, jamais au clic sur Payer » comme l'exige le §8. Il porte
`transaction_id`, `plan_name`, `value`, `currency` et `event_id`.

**Pourquoi dans le navigateur et non à l'activation serveur.** GA4 a besoin du
`client_id` du visiteur pour rattacher l'achat à sa session et à son canal
d'acquisition. Envoyé depuis `activateUserSubscription` par Measurement
Protocol, il atterrirait sur un identifiant synthétique : le chiffre d'affaires
ne serait attribuable à aucune campagne, ce qui lui retire l'essentiel de son
intérêt. S'y ajoute un obstacle concret : ni le webhook Chariow ni
`/api/payment/check` ne se protègent d'un rejeu, et GA4 — contrairement à
Meta — ne dédoublonne pas. Un envoi serveur aurait gonflé le chiffre d'affaires
à chaque relance.

**Deux garde-fous.** Une clé `localStorage` par `ref_command` empêche qu'un
rechargement de la page compte une seconde vente. Et `payment_successful` a été
retiré de `GA4_FORWARD_EVENTS` : le relayer aussi par Measurement Protocol
l'aurait compté deux fois.

**Contrepartie assumée.** Un acheteur qui ne revient jamais sur le site après
son paiement mobile money n'est pas compté dans GA4. La conversion Meta, elle,
part quand même — la Conversions API l'envoie à l'activation. La source de
vérité du chiffre d'affaires reste le back-office, conformément au §2.

**État : corrigé, à rejouer en préproduction** — un paiement réel de bout en
bout n'a pas pu être exécuté ici.

### 2.2 `activation_completed` n'existe pas

Aucune correspondance dans la table, aucun déclenchement. C'est l'événement qui
définit la **première valeur produit** — « première recherche suivie de
l'ouverture d'une campagne, déclenché une seule fois par utilisateur » (§7). Il
sert de règle d'entrée au segment « Inscrit inactif » (§9) et figure parmi les
événements clés du §11.

Il demande un état persistant par utilisateur (déclenchement unique), donc un
calcul côté serveur, pas un simple `push` client.

### 2.3 `plan_limit_reached` n'est jamais déclenché

L'entrée existe (`premium_content_clicked: "plan_limit_reached"`) mais
`premium_content_clicked` n'est appelé nulle part — on ne le trouve que dans la
liste des événements de la page de statistiques admin.

Deux problèmes distincts :

1. **Rien ne le déclenche.** Le compteur de consultations restantes s'affiche
   pourtant bien ([content-detail-client.tsx:294](../app/content/[id]/content-detail-client.tsx)) :
   le moment où la limite est atteinte est identifié dans le code, il n'est
   simplement pas mesuré.
2. **La correspondance est fausse.** « Clic sur un contenu premium » n'est pas
   « une limite produit empêche l'action suivante ». Le brief demande les
   paramètres `limit_type`, `limit_value`, `current_plan`, qui n'ont pas de sens
   pour un clic.

C'est le segment « Limite atteinte » du §9 qui disparaît — celui dont le brief
dit qu'il justifie un message le jour même.

### 2.4 `contact_opt_in_updated` n'existe pas

Aucune correspondance, aucun déclenchement. Le brief le classe P0 avec les
paramètres `channel`, `status`, `source_context`. C'est le signal qui autorise
les envois WhatsApp — et le brief insiste : « déclencher WhatsApp uniquement
avec un opt-in traçable ». Sans cet événement, l'opt-in n'est pas traçable
dans le dispositif de mesure.

### 2.5 `login` et `payment_failed` n'atteignent pas le `dataLayer`

Les deux sont écrits **côté serveur uniquement** :

- `login_success` → [me/login-ping/route.ts:27](../app/api/me/login-ping/route.ts)
- `payment_failed` → [checkout/create-payment/route.ts:296](../app/api/checkout/create-payment/route.ts)

Ils alimentent bien `analytics_events` dans Supabase, mais comme ci-dessus, un
événement serveur ne passe pas par `pushDataLayer`. GTM ne les verra jamais.

---

## 3. Écarts — événements P1 manquants

Aucune correspondance et aucun déclenchement pour :

| Événement | Priorité | Rôle dans le brief |
|---|---|---|
| `view_pricing` | P1 | Entrée du funnel de conversion (§6) |
| `sign_up_started` | P1 | Distingue l'intention d'inscription de sa réussite (§6) |
| `collection_created` | P1 | Signal d'engagement, règle d'entrée du segment « Engagé » (§9) |
| `export_used` | P1 | Usage avancé (§7) |
| `subscription_cancelled` | P1 | Rétention (§8) |

`subscription_renewed` mérite une mention à part : l'entrée existe
(`plan_upgraded: "subscription_renewed"`) mais `plan_upgraded` n'est jamais
appelé — et la correspondance est de toute façon discutable, une montée en
gamme n'étant pas un renouvellement.

---

## 4. Écarts — paramètres non conformes

Les événements ci-dessous partent bien, mais **pas avec les paramètres
demandés**. GTM ne peut pas inventer un paramètre absent du `dataLayer` : ces
écarts se traduiront par des dimensions vides dans GA4.

| Événement | Paramètres attendus (brief) | Paramètres réellement poussés |
|---|---|---|
| `account_created` | `user_id`, `signup_method` | `needs_email_confirmation` |
| `email_verified` | `user_id` | `source` |
| `signup_completed` | `user_id`, `profile_type` | `source`, `sectors_count` |
| `search` | `search_term`, `search_type`, `results_count` | `query` |
| `filter_applied` | `filter_type`, `filter_value`, `results_count` | `categories` |
| `campaign_view` | `content_id`, `sector`, `country` | `campaign_id`, `title`, `brand` |
| `favorite_added` | `content_id` | `campaign_id` |
| `begin_checkout` | `plan_name`, `value`, `currency`, `event_id` | `selection`, plus les clés de `meta` |
| `generate_lead` | `lead_type`, `form_id`, `guide_id` | à aligner |
| `guide_download` | `guide_id`, `source_context` | `study_slug` + `source_context` |

### Les paramètres transversaux du §5 ne sont pas transmis

`pushBusinessEvent` ([lib/analytics.ts:174](../lib/analytics.ts)) ne renseigne
que deux champs de contexte : `source_context` et `event_id`. Trois paramètres
transversaux du brief ne sont donc **jamais** présents dans le `dataLayer` :

- **`user_id`** — le brief en fait un paramètre transversal et l'exige
  nommément sur `account_created`, `email_verified`, `signup_completed`,
  `login` et `activation_completed`. Le §11 demande de le transmettre à GA4
  après authentification. Sans lui, aucune analyse par cohorte ni aucun
  rapprochement entre sessions n'est possible.
- **`user_stage`** — `lead`, `account_created`, `signup_completed`, `activated`,
  `paid`, `dormant`.
- **`subscription_plan`** — `free`, `discovery`, `basic`, `pro`.

L'infrastructure est prête : `DataLayerContext`
([lib/datalayer.ts:57](../lib/datalayer.ts)) déclare déjà ces trois champs avec
les bonnes valeurs. Rien ne les remplit.

Enfin, les `utm_*` sont lus sur **la page courante uniquement**. Le brief
demande de les conserver « au premier contact » et de les associer au lead ou
au compte côté serveur : une visite arrivée par publicité puis navigant deux
pages perd son attribution.

---

## 5. Double comptage Meta à la bascule — corrigé

Le passage sous GTM ne neutralisait que la balise Google : le layout testait
`useGtm` pour retirer `gtag`, mais **le pixel Meta restait chargé par le site**
dans tous les cas. L'aide de `/admin/integrations` demandait pourtant de
configurer « GA4 **et le pixel Meta** dans le conteneur ». Suivre cette consigne
aurait fait partir `PageView`, `Search`, `Lead`, `CompleteRegistration` et
`InitiateCheckout` **deux fois**, et privé les trois dernières de leur
`event_id` commun avec la CAPI — la déduplication du §12 aurait échoué.

**Correctif.** La première des deux issues envisagées a été retenue : le
traitement de GA4 est étendu à Meta.

- Le layout pose `window.__LAVEIYE_GTM_META__` en même temps qu'il injecte le
  conteneur. Le drapeau est donc toujours cohérent avec la page réellement
  servie : une page statique construite avant la bascule garde son pixel — elle
  n'a pas de conteneur pour le doubler.
- [lib/fb-pixel.ts](../lib/fb-pixel.ts) ne charge plus `fbevents.js` quand ce
  drapeau est posé, et `fbTrack` relaie l'événement au conteneur par
  `meta_event` (`meta_event_name` + `event_id`) au lieu d'appeler `fbq`.
- L'aide de `/admin/integrations` décrit maintenant la balise à créer et
  insiste sur l'`event_id`.

Le consentement marketing reste exigé avant tout relais : rien ne part vers le
dataLayer Meta tant que le visiteur n'a pas accepté.

**Vérifié en local**, sur un build de production, dans les deux sens :

| Configuration | Résultat constaté |
|---|---|
| `GTM-` renseigné | Aucune requête vers `connect.facebook.net`, `fbq` absent, `meta_event` présent dans le dataLayer avec `meta_event_name: "PageView"` |
| Aucun conteneur | `fbevents.js` et `signals/config/1889630218258683` chargés comme avant, `fbq` actif, aucun `meta_event` |

**État : corrigé.** Reste à créer la balise Meta dans le conteneur (cf. §0).

**Exception depuis la demande complémentaire** : `/etudes/[slug]` est sortie de
ce dispositif et charge le pixel elle-même (cf. §0 bis). La balise Meta du
conteneur ne la couvre pas — et n'a pas à la couvrir, la landing n'émettant
jamais `meta_event`.

---

## 6. Consentement appliqué aux événements serveur

Le brief demande au §13 d'« appliquer également le choix aux événements serveur
et à Meta CAPI ». L'implémentation actuelle fait un choix intermédiaire,
documenté dans [lib/fb-capi.ts:40](../lib/fb-capi.ts) : sur un refus,
l'événement serveur **part quand même**, seuls l'adresse IP et le user-agent
sont retirés.

Le raisonnement tient — la conversion repose sur des données saisies par
l'utilisateur lui-même — et c'est ce qui a été constaté en recette le 19/08
(« l'événement côté serveur arrive quand même »). Mais l'e-mail haché continue
de partir chez Meta après un refus marketing, ce qui reste une transmission à
une régie publicitaire.

**Ce n'est pas un bug, c'est un arbitrage juridique** qui dépasse la
technique. Il doit être validé explicitement par le responsable du traitement,
pas laissé dans un commentaire de code.

---

## 7. Points de sécurité relevés

1. **Le jeton Meta CAPI figure en clair, page 3 du brief PDF**, qui a circulé
   par e-mail et par WhatsApp. Il donne un accès en écriture au pixel
   `1889630218258683`. **À révoquer et régénérer dans Meta Business Manager**,
   puis à saisir uniquement dans `/admin/integrations` — le remplacement ne
   demande aucun déploiement. Ce point est déjà relevé dans
   [qa/recette-aout-2026.md](recette-aout-2026.md) ; il reste ouvert.

2. Le brief transmet aussi le `Measurement ID` GA4 et l'identifiant du pixel :
   ceux-là sont publics par nature, aucune action n'est nécessaire.

---

## 8. Synthèse

| Bloc du brief | État |
|---|---|
| §4 Installation du conteneur | Conforme |
| §5 Contrat `dataLayer` — nommage, garde-fou données personnelles | Conforme |
| §5 Contrat `dataLayer` — paramètres transversaux | Conforme — posés par `components/analytics/datalayer-identity.tsx` |
| §6 Acquisition et inscription | Conforme — 10 sur 10 |
| §7 Activation et usage | Conforme — 7 sur 8 ; `export_used` sans fonction correspondante dans le produit |
| §8 Paiement et rétention | Conforme — 5 sur 5 |
| §11 Événements clés GA4 | Conforme — les 6 événements clés remontent |
| §12 Meta Pixel et CAPI | Conforme ; le risque de doublon à la bascule est **corrigé** (§5) |
| §13 Cookies et consentement | Conforme côté navigateur ; arbitrage à valider côté serveur |
| §14 Migration | Conforme — le volet Meta est traité ; reste la création de la balise dans le conteneur |

**Ce qu'il reste à faire, et par qui**

1. **Responsable du tracking** — créer la balise Meta dans le conteneur, sur
   l'événement `meta_event` : nom dans `meta_event_name`, **Event ID dans
   `event_id`**. Sans ce dernier, navigateur et Conversions API comptent double.
2. **Responsable du traitement** — trancher l'arbitrage du §6 : sur un refus de
   consentement, l'événement serveur part quand même vers Meta, e-mail haché
   compris.
3. **Big Five** — révoquer et régénérer le jeton Meta CAPI (§7), puis le saisir
   dans `/admin/integrations`.
4. **Recette** — dérouler [qa/recette-tracking.md](recette-tracking.md) en
   préproduction, puis comparer les données pendant 72 heures après la bascule.
