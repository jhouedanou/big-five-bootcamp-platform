# Recette — correctifs des points KO d'août 2026

Branche : `seo`

> ## À FAIRE AVANT DE DÉPLOYER
>
> Passer les migrations **#17** et **#18** dans le SQL Editor Supabase
> (cf. [migrations.md](../migrations.md)) **avant** de pousser sur `seo`.
> Le déploiement part au push, pas au moment de la recette : sans ces
> migrations, l'enregistrement d'un lead d'étude et la sauvegarde d'une
> bannière échouent dès la mise en ligne.

## Comment lire ce document

Chaque ligne reprend **la formulation d'origine de la grille QA**, avec l'attendu
tel qu'il était écrit. La colonne « État » ne dit pas « ça marche » : elle dit où
en est le correctif.

| État | Signification |
|---|---|
| **Livré** | Le correctif est écrit, compilé et poussé. Reste à rejouer sur la préproduction par la personne qui a ouvert la ligne. |
| **Vérifié** | Rejoué et constaté sur la préproduction, avec la date et la personne. |
| **KO** | Rejoué, ne passe toujours pas. La raison est écrite. |

**Aucune ligne n'est marquée « Vérifié » à ce stade.** Les correctifs ont été
validés par compilation et par lecture du code ; l'environnement de
développement utilisé n'a pas d'accès Supabase, donc aucun parcours fonctionnel
n'a été exécuté. La vérification appartient à la préproduction, et à Franck et
Cossi qui ont ouvert les lignes.

---

## Lignes de la grille QA

### 1 — Bannière de l'étude (Franck, 18/08)

> Dans `/admin/bannieres`, ajouter le visuel à la bannière de l'étude et
> l'activer. **Attendu :** elle apparaît en haut de `/dashboard` pour un compte
> connecté, sans intervention technique.
> **KO :** « le rendu ne permet pas de lire toute la bannière si c'est un upload
> d'image ».

**Cause.** Le carrousel traitait le visuel comme un décor : cadré sur la moitié
droite de la carte, recadré sur les deux axes, recouvert d'un dégradé, et
purement absent sur mobile. Correct pour une bannière dont le texte est saisi
dans le formulaire, faux pour un visuel qui porte déjà sa mise en page.

**Correctif.** Un mode d'affichage au choix dans `/admin/bannieres` :
« Bannière éditoriale » (rendu d'avant) ou « Visuel complet » (le visuel occupe
toute la carte, sans dégradé ni texte par-dessus, rien n'est rogné). L'aperçu de
l'admin adopte le cadre et le cadrage du rendu réel ; il montrait jusqu'ici une
vignette carrée recadrée. Format conseillé affiché : 1200 × 375 px.

**À rejouer.** Ouvrir la bannière de l'étude, choisir « Visuel complet »,
téléverser le visuel, activer. Vérifier sur `/dashboard` que le visuel est
entier et lisible, que toute sa surface est cliquable et que le lien s'ouvre
dans un nouvel onglet.

**État : Livré** · commit `5c9e554` · migration **#17** requise

---

### 2 — Vignette automatique et lecture des liens vidéo (Franck, 19/08)

> Ne pas mettre d'image principale sur cette campagne. **Attendu :** une vignette
> apparaît quand même automatiquement sur la carte du tableau de bord.
> **KO :** « avec YouTube ça marche ; avec Drive non ; avec Instagram non (et ça
> affiche “voir la vidéo Facebook” pour un post Instagram, le lecteur ne prend
> pas en compte le format) ; avec Facebook non plus, même problème de format ».

Quatre défauts distincts, traités séparément.

**Vignette Drive.** Le helper qui construit la vignette Google Drive existait
dans le code sans aucun appelant : ni la saisie de l'URL, ni la carte du tableau
de bord ne s'en servaient. Les deux passent désormais par lui. Rappel : Drive
n'expose une vignette que si le fichier est partagé « toute personne disposant
du lien ».

**Vignette Instagram et Facebook.** Meta a fermé son oEmbed public en 2020 ; il
faudrait un jeton d'application **et** une validation Meta que nous n'avons pas.
Pour ces deux plateformes, la réponse est éditoriale, pas technique : republier
la vidéo (voir ligne 3).

**« Voir la vidéo Facebook » sur un post Instagram.** Le libellé venait de la
plateforme déclarée sur la campagne, alors que le lecteur, lui, suivait l'URL :
les deux pouvaient se contredire à l'écran. Le libellé suit maintenant l'URL.

**Format de la vidéo.** L'orientation était déduite du libellé déclaré : un Reel
Facebook partait en paysage et se retrouvait coupé. Elle est déduite de l'URL
(`/reel/`, `/shorts/`, `/tv/`) puis de la plateforme réelle ; pour un fichier
hébergé, des dimensions lues dans le média.

**À rejouer.** Une campagne par cas : lien Drive public sans image principale
(vignette attendue) ; campagne étiquetée Facebook avec une URL Instagram
(libellé « Instagram » attendu) ; Reel Instagram et Reel Facebook (lecteur au
format vertical, vidéo entière).

**État : Livré** · commit `aa9bdf4`

---

### 3 — Vidéo téléversée non reconnue (Franck, 19/08)

> Téléverser un fichier vidéo, publier, puis survoler la carte sur `/dashboard`.
> **Attendu :** la vidéo se joue en silence dans la carte ; en retirant la souris,
> l'image et le bouton Play reviennent.
> **KO :** « le fichier n'a pas été reconnu dans l'admin comme dans le dashboard ».

**Cause.** La détection de plateforme ne connaissait que les réseaux sociaux :
une URL de fichier hébergé sortait en « non reconnue ». En cascade, l'admin
affichait « Plateforme non reconnue » et « vignette non récupérable », l'aperçu
disparaissait, et le lecteur annonçait « cette vidéo ne peut pas être intégrée
ici » — sur un fichier qu'il suffisait de lire. L'aperçu au survol, lui, était
justement réservé à ces fichiers : il ne pouvait donc jamais se déclencher.

**Correctif.** Le fichier hébergé est une plateforme à part entière : reconnu,
étiqueté « Fichier hébergé sur la plateforme », lu par un vrai lecteur vidéo
dans l'admin, dans la fiche et dans la modale. Une vignette est capturée dans la
vidéo au moment du téléversement, il n'y a plus de capture d'écran à faire. Le
survol est aussi câblé sur l'affichage en liste, qui n'en avait pas.

**Consigne.** Le stockage de la plateforme est limité : le téléversement direct
n'est pas la voie normale. Pour une vidéo Instagram, Facebook, TikTok ou Drive,
l'encart de l'admin demande de la télécharger (extension de navigateur) puis de
la republier sur le **compte YouTube de l'entreprise** (en non répertoriée) ou
sur **livid.com**, et de coller ce lien. YouTube est géré de bout en bout :
lecture, vignette automatique, format vertical reconnu pour les Shorts.

**À rejouer.** Téléverser un MP4 : pastille verte, aperçu jouable dans l'admin,
vignette générée, lecture dans la fiche, aperçu muet au survol de la carte.

**État : Livré** · commit `aa9bdf4`

**Réserve ouverte — livid.com.** La plateforme est reconnue et étiquetée, mais
son mode d'intégration n'est pas documenté publiquement : le lecteur propose un
lien externe plutôt que de risquer un cadre vide. **Une URL d'exemple suffit à
finir ce point.**

---

### 4 — Studio : références depuis la bibliothèque (Franck, 19/08)

> Ouvrir « Studio » depuis le menu du site. **Attendu :** une conversation s'ouvre
> et demande d'envoyer une création de référence.
> **KO :** « on a l'effet escompté, mais est-ce qu'en plus d'uploader un fichier
> depuis le bureau on peut rajouter des créas depuis la bibliothèque Laveiye ? »

**Correctif.** Oui. Un bouton « Choisir dans la bibliothèque » est ajouté à côté
du téléversement, avec recherche. La créa choisie devient la référence. L'image
est récupérée et recopiée côté serveur : le navigateur n'envoie que
l'identifiant de la campagne, et le contrôle d'accès aux contenus premium reste
la seule porte d'entrée. Seules les campagnes publiées et pourvues d'un visuel
sont proposées.

**À rejouer.** Studio → « Choisir dans la bibliothèque » → rechercher une marque
→ sélectionner. La conversation doit enchaîner comme avec un fichier téléversé.

**État : Livré** · commit `08764ff`

---

### 5 — « S'en inspirer dans le studio » absent de la fiche (19/08)

> Depuis la fiche d'une campagne, cliquer « S'en inspirer dans le studio ».
> **Attendu :** la conversation indique avoir repris le secteur et le canal de la
> campagne.
> **KO :** « j'ai pas ça depuis la fiche d'une campagne ».

**Cause.** Le bouton existait, mais uniquement dans le bloc Actions **mobile** ;
sur ordinateur il n'y avait rien. Il était de plus masqué aux comptes sans
abonnement — masqué, il ne dit pas « réservé aux abonnés », il dit « ça n'existe
pas », ce qui est exactement la conclusion tirée en recette.

**Correctif.** Le bouton est monté dans les deux blocs, et visible pour tous ;
un compte sans abonnement est renvoyé vers l'offre avec la mention « Inclus à
partir de l'offre Basic ».

**À rejouer.** Fiche campagne **sur ordinateur et sur mobile**, avec un compte
Free puis un compte Basic ou Pro. Sur un compte abonné, le studio doit annoncer
le secteur et le canal repris.

**État : Livré** · commit `08764ff`

---

### 6 et 7 — Pixel Meta non détecté (Cossi, 19/08)

> Ouvrir « Test Events » de Meta pendant qu'on envoie le formulaire de l'étude.
> **Attendu :** un événement « Lead » arrive, pas de double comptage.
> Puis : refuser les cookies et envoyer le formulaire. **Attendu :** rien ne part
> du navigateur vers Meta, l'événement côté serveur arrive quand même.
> **KO :** « l'environnement de test ne détecte pas le pixel Meta sur la page du
> formulaire, ni l'extension Pixel Helper sur la page de téléchargement ».

**Cause.** Le bandeau RGPD n'était monté que sur la page d'accueil. Un visiteur
qui arrive d'une publicité directement sur `/etudes/finance` ne pouvait donc
jamais se prononcer ; le consentement marketing restait à sa valeur par défaut
« refusé », et le script du pixel n'était **jamais téléchargé**. Ni Test Events
ni le Pixel Helper ne pouvaient voir quoi que ce soit : il n'y avait rien à voir.

**Correctif.** Le bandeau est monté sur toutes les routes. La protection ne
bouge pas : le défaut reste « refusé » et rien ne part sans acceptation — c'est
précisément ce que demande la ligne suivante de la grille. Un PageView Meta est
par ailleurs ajouté sur la page de l'étude, qui n'en émettait aucun.

**À rejouer.** Sur un profil de navigateur neuf :
1. Ouvrir `/etudes/finance` → le bandeau RGPD doit s'afficher, et **aucune**
   requête vers `connect.facebook.net` ne doit partir avant le choix.
2. Refuser → envoyer le formulaire → rien vers Meta côté navigateur, et Test
   Events montre l'événement `Lead` **serveur** seul.
3. Accepter → envoyer le formulaire → Test Events montre `Lead` navigateur **et**
   serveur, **dédupliqués** (même identifiant d'événement).

**État : Livré** · commit `1bdcb50`

---

### 8 — Nouveau jeton Meta sans effet (Cossi, 19/08)

> Coller le nouveau jeton Meta dans `/admin/integrations`, puis refaire le test.
> **Attendu :** les conversions continuent d'arriver, sans intervention technique.
> **KO :** « test effectué, mais cela ne change pas l'échec obtenu ».

**Cause.** L'identifiant du pixel était codé en dur côté navigateur. Seule la
moitié serveur lisait `/admin/integrations` : les deux moitiés du couple
Pixel/CAPI pouvaient donc viser deux pixels différents, auquel cas la
déduplication ne peut pas fonctionner, quel que soit le jeton saisi.

**Correctif.** L'identifiant du pixel est résolu côté serveur depuis
`/admin/integrations` et transmis au navigateur, comme celui de Google
Analytics. Changer le pixel dans l'admin change les deux moitiés.

**À rejouer.** Modifier l'identifiant du pixel dans `/admin/integrations`,
recharger une page publique, accepter les cookies, puis vérifier dans les
requêtes réseau que le navigateur envoie bien sur le nouvel identifiant, sans
redéploiement.

**Précision technique.** Les pages publiques sont rendues à la construction :
l'identifiant écrit dans leur HTML est celui du dernier déploiement. Le
navigateur relit donc la configuration à l'exécution et corrige la valeur avant
le chargement du pixel — qui n'a lieu qu'après acceptation du bandeau. Sur une
page déjà ouverte au moment du changement, il faut recharger.

**État : Livré** · commit `1bdcb50`

---

## Demandes des briefs traitées dans le même lot

| Sujet | Priorité | Ce qui a été fait | Commit |
|---|---|---|---|
| Conteneur GTM, dataLayer, Consent Mode | P0 | Conteneur installé (identifiant piloté depuis `/admin/integrations`), contrat dataLayer, consentement appliqué aussi à Google Analytics — il s'en affranchissait | `1bdcb50` |
| Formulaire de collecte (études) | P0 | Champs Pays et Secteur d'activité, indicatif téléphonique imposé, numéro stocké au format international ; remontée dans l'admin et l'export CSV | `e3e991e` |
| Sécurisation des médias | P0 | Vignettes déduites de l'URL pour YouTube et Drive, vignette capturée pour les fichiers hébergés, et consigne de republication pour sortir des URL fragiles | `aa9bdf4` |
| Alertes e-mail hebdomadaires | P1 | Envoi en campagne Mailchimp unique vers un segment, gabarit repris à la charte LAVEIYE | `8fce6b9` |
| Bannière « Big Five Décrypte » | P2 | Interrupteur dans `/admin/temps-forts` | `b84fa28` |

---

## Bascule GTM — à ne pas faire à la légère

Tant qu'aucun conteneur n'est renseigné dans `/admin/integrations`, **rien ne
change** : le site garde sa balise Google Analytics actuelle. Dès qu'un
identifiant `GTM-` est saisi, cette balise s'efface et le conteneur prend la
main. C'est volontaire : les deux ensemble compteraient chaque page vue, chaque
inscription et chaque paiement **deux fois**.

Ordre à respecter, repris du brief (§14) :

1. Configurer GA4 et le pixel Meta **dans le conteneur**, sans publier.
2. Vérifier les événements en mode Aperçu.
3. Publier le conteneur, puis saisir l'identifiant `GTM-` dans
   `/admin/integrations` — la bascule est alors instantanée et sans déploiement.
4. Comparer les données pendant 72 heures avant de considérer la migration finie.

**Ce qui cesse de remonter dans Google Analytics après la bascule.** Le
conteneur ne reçoit que le vocabulaire d'événements spécifié au brief. Les
signaux d'interface et d'administration (ouverture d'une pop-up, filtres de
l'admin, aperçu de webinaire, recherche sans résultat…) restent mesurés dans la
base Laveiye et alimentent toujours les tableaux de bord internes, mais ils
n'iront ni dans GA4 ni chez Meta. La liste exacte est dans `lib/datalayer.ts`
(`NOT_FORWARDED_TO_DATALAYER`). Les mesures que l'équipe suit — impressions et
clics de bannière, funnel des études, inscriptions aux webinaires — sont bien
transmises.

**Parcours de recette obligatoire du brief (§15)**, à rejouer en préproduction :
visite anonyme de l'accueil → téléchargement du guide → création de compte →
vérification de l'e-mail → fin d'inscription → connexion → recherche et filtre →
ouverture d'une campagne → favori ou collection → limite atteinte → début de
paiement → paiement réussi puis échoué.

À contrôler à chaque étape : un seul conteneur chargé, un seul `page_view` par
navigation, aucun doublon sur les événements clés.

---

## Points ouverts

1. **livid.com** — une URL d'exemple est attendue pour terminer l'intégration du
   lecteur (ligne 3).
2. **oEmbed Meta** — la récupération automatique des vignettes Instagram et
   Facebook demanderait un jeton d'application et une validation Meta que nous
   n'avons pas. La consigne de republication est la réponse retenue.
3. **Jeton Meta CAPI** — il figure en clair dans le PDF du brief tracking, qui a
   circulé par e-mail et WhatsApp. **À révoquer et régénérer**, puis à saisir
   uniquement dans `/admin/integrations`.
4. **Mot de passe administrateur** — un e-mail et un mot de passe figuraient en
   clair dans le code de la page `/admin/guide`. Ils en sont retirés ; **le mot
   de passe concerné doit être changé**.
5. **Expéditeur Mailchimp** — le nom et l'e-mail d'envoi doivent être renseignés
   dans Paramètres → Mailchimp, sinon la campagne hebdomadaire ne peut pas être
   créée.
6. **Audience Mailchimp** — la synchronisation ajoute tout compte Laveiye à
   l'audience avec le statut « abonné », et elle tourne désormais chaque lundi
   au lieu d'être déclenchée à la main. Elle ne réabonne jamais quelqu'un qui
   s'est désabonné : le statut n'est modifié que dans le sens du désabonnement.
   `?dryRun=1` saute l'envoi mais exécute quand même la synchronisation.
7. **Segment déjà créé** — le segment « Laveiye — alertes hebdo » n'est créé
   qu'une fois. Si ses conditions doivent changer plus tard, le supprimer dans
   Mailchimp pour qu'il soit recréé, ou l'ajuster à la main.
