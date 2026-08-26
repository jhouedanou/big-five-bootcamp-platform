# Recette du tracking — Laveiye

Branche : `seo`
Référence : *Brief tracking — Laveiye, mis à jour*
Version du document : 26/08/2026

## À qui s'adresse ce document

À la personne qui va **vérifier** que la mesure fonctionne — pas à celle qui l'a
écrite. Chaque contrôle dit quoi faire, ce qui doit se produire, et où le
constater. Si un contrôle échoue, la ligne indique quoi rapporter.

## Avant de commencer

**Profil de navigateur neuf**, ou au minimum : cookies et stockage local vidés
pour le domaine testé. Plusieurs contrôles reposent sur l'état « le visiteur ne
s'est pas encore prononcé sur les cookies », et sur des clés locales qui
empêchent de compter deux fois un même achat.

Quatre outils, un par destination :

| Outil | Ce qu'il montre |
|---|---|
| **Tag Assistant** (Google) | Le conteneur GTM, le contenu du dataLayer, l'état de consentement |
| **GA4 → DebugView** | Ce que Google Analytics reçoit réellement |
| **Meta Events Manager → Test Events** | Ce que Meta reçoit, navigateur **et** serveur |
| **`/admin/tracking`** | Ce que la base Laveiye a enregistré, événement par événement |

`/admin/tracking` est la nouveauté : elle répond à « est-ce que la mesure
fonctionne », sans passer par Google ni Meta. Pour la plupart des contrôles
ci-dessous, elle suffit à trancher.

## Un mot sur l'ordre des choses

Le site ne pousse pas directement dans GA4. Il pousse des **événements métier**
dans le `dataLayer`, et c'est GTM qui décide des destinations. Un événement peut
donc être parfaitement émis par le site et absent de GA4 si la balise n'est pas
configurée dans le conteneur. En cas d'écart, regarder d'abord Tag Assistant :
si l'événement y est, le problème est dans GTM, pas dans le site.

---

## 0. Ce qui reste à configurer dans GTM

**À faire avant la recette Meta**, sinon les contrôles 12 à 14 échoueront pour
une raison qui n'est pas un défaut du site.

Le site ne charge plus le pixel Meta lui-même dès qu'un conteneur `GTM-` est
renseigné dans `/admin/integrations` : il annonce l'événement au conteneur, qui
porte la balise. Sans cette bascule, chaque conversion partirait deux fois.

Créer **une** balise Meta, déclenchée sur l'événement `meta_event` du dataLayer :

| Champ de la balise | Variable Data Layer |
|---|---|
| Nom de l'événement | `meta_event_name` |
| Event ID | `event_id` |

Les valeurs possibles de `meta_event_name` : `PageView`, `ViewContent`,
`Search`, `Lead`, `CompleteRegistration`, `InitiateCheckout`.

> **La landing `/etudes/[slug]` est hors de ce dispositif**, à la demande du
> client : elle charge le pixel elle-même, que le conteneur soit configuré ou
> non. Elle n'émet donc jamais `meta_event`, et la balise ci-dessus ne s'y
> déclenche pas. Ce n'est pas un oubli de configuration : c'est ce qui empêche
> le doublon. Voir §0 bis de
> [qa/conformite-brief-tracking.md](conformite-brief-tracking.md).

> **L'Event ID n'est pas optionnel.** Les conversions importantes sont envoyées
> deux fois à Meta — une fois par le navigateur, une fois par le serveur
> (Conversions API) — et c'est `event_id` qui permet à Meta de comprendre qu'il
> s'agit de la même. Sans lui, Meta compte deux conversions au lieu d'une.

---

## Parcours obligatoire du brief (§15)

À dérouler dans l'ordre, sur le même profil de navigateur.

### 1 — Visite anonyme de l'accueil

**Faire.** Ouvrir la page d'accueil sur un profil neuf.

**Attendu.**
- Le bandeau RGPD s'affiche.
- Tag Assistant montre **un seul** identifiant `GTM-`.
- **Aucune** requête vers `connect.facebook.net` dans l'onglet Réseau — le
  visiteur ne s'est pas encore prononcé.
- Dans Tag Assistant, l'état de consentement par défaut est `denied` pour
  `analytics_storage`, `ad_storage`, `ad_user_data` et `ad_personalization`.

**Si ça échoue.** Deux `GTM-` = l'ancien code de mesure n'a pas été retiré.
Une requête Facebook avant le choix = le bandeau n'est pas monté sur cette route.

### 2 — Refus des cookies

**Faire.** Cliquer « Continuer sans accepter », puis naviguer sur deux ou trois
pages.

**Attendu.**
- Aucune requête vers `connect.facebook.net`.
- Dans Tag Assistant, les balises Analytics et Marketing restent bloquées.
- Les événements continuent d'apparaître dans le `dataLayer` : c'est normal, le
  site les expose, GTM ne les envoie pas.

### 3 — Acceptation des cookies

**Faire.** Vider le stockage, recharger, cliquer « Tout accepter ».

**Attendu.**
- L'état de consentement passe à `granted` **immédiatement**, sans rechargement.
- Les balises autorisées se déclenchent alors.

### 4 — Téléchargement du guide Finance

**Faire.** Ouvrir `/etudes/finance`, ouvrir le formulaire, le remplir et
l'envoyer avec une adresse jamais utilisée.

**Attendu.**

| Événement | Paramètres à vérifier | Où |
|---|---|---|
| `generate_lead` | `lead_type`, `form_id`, `guide_id` | Tag Assistant, `/admin/tracking` |
| `contact_opt_in_updated` | `channel: email`, `status: granted` | `/admin/tracking` |
| Meta `Lead` | **navigateur et serveur, dédoublonnés** | Test Events |

**`guide_download` ne doit PAS partir ici.** Il ne part plus à l'envoi du
formulaire, mais à l'ouverture du lien reçu par email — voir le contrôle 4 bis.
S'il apparaît à la soumission, c'est que l'ancien appel n'a pas été retiré.

**Le point délicat.** Dans Test Events, `Lead` doit apparaître une fois avec la
mention de déduplication, pas deux fois séparément. Si vous voyez deux `Lead`
distincts, c'est l'`event_id` qui n'est pas transmis par la balise GTM
(cf. section 0). **Sur cette page, la balise GTM n'est pas en cause** : le pixel
est chargé par la page elle-même, l'`event_id` vient directement du serveur.

### 4 bis — Ouverture du lien de téléchargement

**Faire.** Ouvrir l'email reçu au contrôle 4 et cliquer « Télécharger l'étude ».

**Attendu.**
- Le navigateur passe brièvement par `/etudes/telechargement?token=…` puis le
  PDF se télécharge.
- `guide_download` apparaît avec `guide_id` (le slug de l'étude) et
  `source_context: email_link` — Tag Assistant et `/admin/tracking`.

**Puis recharger la page de relais.** `guide_download` ne doit **pas** repartir :
une clé de session par jeton l'en empêche. Le fichier, lui, se télécharge de
nouveau — c'est voulu, le comptage `download_count` de la base reste le compteur
de fichiers servis.

**Si ça échoue.** Un lien qui pointe encore sur `/api/etudes/download` est un
email envoyé **avant** cette version : il délivre bien l'étude, simplement sans
mesure. Redemander l'étude pour obtenir un lien à jour.

### 4 ter — Interactions de la landing

**Faire.** Sur `/etudes/finance` : faire défiler l'aperçu (flèches **puis**
pastilles), ouvrir deux questions de la FAQ, ouvrir le formulaire et le fermer
**sans l'envoyer**.

**Attendu.**

| Événement | Paramètres à vérifier |
|---|---|
| `study_preview_navigated` | `slide_index`, `method` (`arrow` puis `dot`) |
| `study_faq_opened` | `faq_index`, `faq_question` |
| `study_form_abandoned` | `cta` (`hero` ou `footer`), `fields_filled` |

**Les points délicats.**
- Ouvrir puis refermer trois fois la même question de la FAQ ne doit produire
  **qu'un** `study_faq_opened`.
- Après un envoi **réussi**, fermer la modale ne doit produire **aucun**
  `study_form_abandoned`. C'est le piège de ce contrôle : le succès ne ferme pas
  la modale, c'est le visiteur qui la ferme.
- `fields_filled` est un **nombre**. Si vous y voyez un nom, une adresse ou un
  numéro, c'est un défaut bloquant — à signaler immédiatement.

### 4 quater — Le pixel sur la landing

**Faire.** Avec un `GTM-` configuré dans `/admin/integrations`, accepter les
cookies puis ouvrir `/etudes/finance`. Regarder l'onglet Réseau.

**Attendu.**
- `connect.facebook.net/en_US/fbevents.js` **est chargé** — c'est la page qui
  porte le pixel, pas le conteneur.
- Dans le `dataLayer`, **aucun** `meta_event`.

**Puis aller sur `/dashboard`** dans le même onglet. Là, l'inverse : aucun
nouvel appel Facebook, et `meta_event` présent dans le `dataLayer`.

**Si ça échoue.** Un `meta_event` sur la landing **et** un pixel chargé
signifierait un doublon : c'est le seul scénario à remonter en urgence.

### 5 — Refus des cookies puis envoi du formulaire

**Faire.** Profil neuf, refuser les cookies, envoyer le formulaire.

**Attendu.** Rien ne part du navigateur vers Meta. Test Events montre quand même
l'événement `Lead` **serveur** — la conversion existe, elle est constatée
côté serveur sur des données que la personne a elle-même saisies.

> **À valider par le responsable du traitement, pas par la recette.** Sur un
> refus, l'e-mail haché continue de partir vers Meta ; seuls l'adresse IP et le
> user-agent sont retirés. C'est un arbitrage juridique assumé, pas un défaut.

### 6 — Création de compte

**Faire.** Aller sur `/register`. **Cliquer dans un champ et taper un caractère**,
puis remplir et envoyer.

**Attendu.**

| Événement | Quand | Paramètres |
|---|---|---|
| `sign_up_started` | à la **première frappe**, une seule fois | `signup_method` |
| `account_created` | à la création confirmée | `user_id`, `signup_method` |
| Meta `CompleteRegistration` | à la création | dédoublonné navigateur/serveur |

**Le point délicat.** `sign_up_started` ne doit partir **qu'une fois**, quel que
soit le nombre de champs remplis. S'il part à chaque frappe, c'est un défaut.

### 6 bis — Consentement marketing à l'inscription

**Faire.** Sur `/register`, laisser la case « Je souhaite recevoir les actualités
et les alertes de veille » **décochée**, et envoyer. Recommencer avec une autre
adresse, case **cochée**.

**Attendu.** `contact_opt_in_updated` part dans les **deux** cas, avec
`channel: email`, `source_context: register`, et `status: denied` puis
`status: granted`.

**Le point délicat.** La case doit être décochée à l'ouverture de la page. Une
case pré-cochée ne vaut pas consentement et serait un défaut bloquant.

### 7 — Vérification de l'e-mail

**Faire.** Cliquer le lien reçu par e-mail.

**Attendu.** `email_verified`, avec `user_id`.

**Le point délicat.** Ce contrôle échouait jusqu'ici sans qu'on le sache : selon
le type de lien envoyé par Supabase, la confirmation atterrissait droit sur le
tableau de bord sans passer par l'écran de confirmation, et l'événement n'était
jamais émis. Les deux types de liens y passent désormais. Si l'événement manque
toujours, relever l'URL **complète** du lien reçu : c'est le paramètre `type`
qui manque.

### 8 — Fin de l'inscription

**Faire.** Dérouler l'onboarding jusqu'au bout.

**Attendu.** `signup_completed`, avec `user_id` et `profile_type` (la fonction
déclarée). C'est cet événement, et non `account_created`, qui marque la fin du
parcours d'inscription.

### 9 — Connexion

**Faire.** Se déconnecter, se reconnecter par e-mail et mot de passe.

**Attendu.** `login`, avec `user_id` et `method: password`.

`method` était absent de toutes les lignes jusqu'au 26/08 : la route serveur
écrivait des métadonnées vides. À vérifier explicitement dans `/admin/tracking`.

**Limite connue.** Seule la connexion par mot de passe est mesurée. Une connexion
par un fournisseur externe ne produit pas encore cet événement.

### 10 — Recherche, filtre, ouverture de campagne

**Faire.** Depuis le tableau de bord : lancer une recherche, appliquer un filtre,
ouvrir une fiche campagne.

**Attendu.**

| Événement | Paramètres à vérifier |
|---|---|
| `search` | `search_term`, `search_type`, **`results_count`** |
| `filter_applied` | `filter_type`, `filter_value`, **`results_count`** |
| `campaign_view` | `content_id`, **`sector`**, **`country`** |

**Le point délicat sur `campaign_view`.** `sector` et `country` partaient vides
à **chaque** consultation : l'événement était émis avant que la fiche soit
chargée. Ouvrir une campagne qui a bien un secteur et un pays renseignés, et
vérifier que les deux remontent.

**Le point délicat.** `search` ne doit **pas** partir à chaque caractère saisi,
uniquement à la soumission. Et `results_count` doit refléter le nombre réel de
résultats, y compris quand il vaut zéro.

### 11 — Activation : la première valeur produit

**Faire.** Avec un compte **qui n'a jamais rien fait** : une recherche, puis
ouvrir une campagne.

**Attendu.** `activation_completed`, avec `activation_method`, **une seule fois**.

**Puis refaire.** Nouvelle recherche, nouvelle campagne. `activation_completed`
ne doit **pas** repartir. Vérifier dans `/admin/tracking` que le compteur reste
à 1 pour ce compte.

> C'est le serveur qui tranche, pas le navigateur : changer d'appareil ou vider
> le stockage ne doit pas faire repartir l'événement. Le tester vaut la peine.

### 12 — Atteinte d'une limite

**Faire.** Avec un compte gratuit, consulter des campagnes jusqu'au blocage. Puis
recommencer avec la limite de recherches.

**Attendu.** `plan_limit_reached`, avec `limit_type`, `limit_value` et
`current_plan`. `limit_type` vaut `campaign_views`, `searches`, `filters`,
`premium_content` ou `downloads` selon le blocage rencontré.

**Le point délicat.** L'événement doit partir au moment où la limite **empêche**
l'action — pas au clic sur un contenu premium. Une répétition est normale et
voulue : le brief s'en sert pour décider d'une relance.

### 13 — Favori et collection

**Faire.** Ajouter une campagne aux favoris, puis créer une collection.

**Attendu.** `favorite_added` (`content_id`) et `collection_created`
(`collection_id`).

### 14 — Début de paiement

**Faire.** Aller au paiement, choisir une offre, cliquer pour payer.

**Attendu.**

| Événement | Quand | Paramètres |
|---|---|---|
| `begin_checkout` | au clic sur **Payer**, pas au choix de l'offre | `plan_name`, `value`, `currency`, `event_id` |
| Meta `InitiateCheckout` | au même moment | dédoublonné navigateur/serveur |

**Le point délicat.** Choisir une offre puis en changer d'avis ne doit produire
**aucun** `begin_checkout`. Seul le départ effectif vers le paiement compte.

### 15 — Paiement réussi

**Faire.** Aller au bout d'un paiement réel.

**Attendu.**

| Événement | Paramètres |
|---|---|
| `purchase` | `transaction_id`, `plan_name`, `value`, `currency`, `event_id` |
| Meta `Purchase` | **serveur uniquement** — normal, voir ci-dessous |
| `subscription_renewed` | en plus, si la commande était un renouvellement |

**Le point délicat.** Recharger la page de confirmation, revenir en arrière,
rouvrir le lien : `purchase` ne doit partir **qu'une seule fois**. Vérifier le
compteur dans `/admin/tracking`.

> **Pourquoi `Purchase` n'apparaît que côté serveur chez Meta.** Le paiement fait
> foi quand le prestataire l'a confirmé, pas quand le navigateur revient. La
> conversion part donc du serveur, à l'activation de l'abonnement. Il n'y a rien
> à dédoublonner : il n'existe qu'une moitié.

> **Limite assumée.** Un acheteur qui ne revient jamais sur le site après son
> paiement mobile money n'est pas compté dans GA4. La conversion Meta, elle, part
> quand même. La source de vérité du chiffre d'affaires reste le back-office.

### 16 — Paiement échoué ou abandonné

**Faire.** Démarrer un paiement et l'abandonner chez le prestataire.

**Attendu.** `payment_failed`, avec `payment_provider` et `failure_type`.
Recharger la page ne doit pas produire un second événement.

### 16 bis — Retrait du consentement marketing

**Faire.** Dans les paramètres du compte, section « Communications », basculer
l'interrupteur « Actualités et alertes de veille » dans un sens, puis dans
l'autre.

**Attendu.** `contact_opt_in_updated` à chaque bascule, avec
`source_context: settings` et `status` qui suit l'interrupteur.

**Le point délicat.** C'est le **seul** endroit du produit qui produit
`status: denied`. Sans lui, l'opt-in du §9 ne serait pas révocable, et le brief
n'autorise les envois qu'avec un consentement traçable — donc retirable.

> **Prérequis** : la migration 20 (`users.marketing_opt_in`) doit être appliquée
> en base. Sans elle, l'interrupteur affiche une erreur d'enregistrement.

### 17 — Annulation d'abonnement

**Faire.** Dans les paramètres du compte, demander l'annulation.

**Attendu.** `subscription_cancelled`, avec `plan_name` et `cancellation_reason`.

---

## Contrôles transversaux

À faire une fois le parcours terminé.

### Aucun doublon

| Contrôle | Attendu |
|---|---|
| Navigation entre plusieurs pages | **Un seul** `page_view` par navigation |
| Une inscription | Un seul `account_created`, un seul `signup_completed` |
| Une commande payée | Un seul `purchase` |
| Chaque conversion Meta | Une seule ligne dans Test Events, dédoublonnée |

**Si un `page_view` part en double**, la cause la plus fréquente est la Mesure
améliorée de GA4 activée en même temps que l'événement du conteneur.

### Les trois paramètres transversaux

Sur **n'importe quel** événement émis par un visiteur connecté, Tag Assistant
doit montrer :

- `user_id` — l'identifiant interne, jamais une adresse e-mail ;
- `user_stage` — `lead`, `account_created`, `signup_completed`, `activated` ou `paid` ;
- `subscription_plan` — `free`, `discovery`, `basic` ou `pro`.

Sur un visiteur anonyme, seul `user_stage: lead` est présent. C'est normal.

### Aucune donnée personnelle

Parcourir le `dataLayer` dans Tag Assistant : **aucune** adresse e-mail, aucun
numéro de téléphone, aucun nom, aucun jeton. Un garde-fou les filtre à la
source, mais le contrôle vaut la peine d'être fait une fois.

### Environnement

Sur la préproduction, chaque événement doit porter `environment: staging`. Si
vous voyez `production` sur la préproduction, les données de test polluent les
rapports.

---

## Ce qui ne peut pas être testé, et pourquoi

| Élément | Raison |
|---|---|
| `user_stage: dormant` | Le brief §9 en fait un calcul quotidien du back-end (« aucune activité depuis 14 jours »). Un navigateur en train d'émettre un événement est, par définition, tout sauf dormant. |
| `page_view` dans `/admin/tracking` | Volontairement non enregistré en base : une ligne par page vue n'apprendrait rien que GA4 ne sache déjà. Se vérifie dans Tag Assistant. |
| `export_used` | Six téléchargements utilisateur existent (visuel premium, reçu, confirmation imprimée, deux `.ics`, image Studio-Pub) mais aucun n'est encore instrumenté. Le câblage reste à arbitrer. |
| Connexion par fournisseur externe | Seule la connexion par mot de passe émet `login` aujourd'hui. |

---

## Comment rapporter un écart

Pour chaque contrôle qui échoue, indiquer :

1. **Le numéro du contrôle** ci-dessus ;
2. **Ce qui s'est produit**, mot pour mot — le nom de l'événement vu, ou son absence ;
3. **Où** vous l'avez constaté (Tag Assistant, GA4, Test Events, `/admin/tracking`) ;
4. **Le compte utilisé** et son plan.

Ces quatre informations suffisent presque toujours à trancher entre un défaut du
site et une balise à configurer dans le conteneur.

---

## Rappels hors recette

1. **Le jeton Meta CAPI figure en clair dans le PDF du brief**, qui a circulé par
   e-mail et WhatsApp. À révoquer et régénérer dans Meta Business Manager, puis à
   saisir dans `/admin/integrations` — le remplacement ne demande aucune mise en
   ligne.
2. **La bascule GTM se fait en dernier.** Configurer GA4 et Meta dans le
   conteneur, vérifier en mode Aperçu, publier, *puis* saisir l'identifiant
   `GTM-` dans `/admin/integrations`. Comparer les données pendant 72 heures
   avant de considérer la migration terminée (brief §14).
