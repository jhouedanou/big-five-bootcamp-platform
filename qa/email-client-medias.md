# E-mail client — sécurisation des médias

> **Brouillon finalisé le 26/08/2026, complété après la seconde passe — chiffres réels.**
> À envoyer une fois le code déployé en production (les visuels, eux, sont déjà
> migrés). Relecture par Jean Luc avant expédition.

**Objet :** Sécurisation des visuels LAVEIYE — c'est en ligne

---

Bonjour à tous,

Nous avons terminé le chantier décrit dans votre brief sur la sécurisation des
médias. Voici où nous en sommes.

## Ce que nous avons trouvé

Les visuels ne disparaissaient pas à cause d'un problème de droits sur Google
Drive. Quand un fichier Drive est supprimé, Google ne renvoie pas d'erreur : il
renvoie sa page de connexion, avec un code de réponse « tout va bien ». Le
navigateur reçoit donc une page web là où il attend une image, et la plateforme,
qui ne voyait aucune erreur, n'avait aucune raison de vous alerter.

Cela explique la capture que vous nous avez transmise. **33 Export** et **MTN
Cameroun** ont bien été importées le même jour, le 2 juin. Ce qui les sépare,
c'est que le visuel de 33 Export avait été rapatrié sur nos serveurs en juin,
tandis que celui de MTN Cameroun était resté sur Drive. Sur les 38 campagnes de
cet import, les 20 rapatriées vont toutes bien ; sur les 18 restées sur Drive,
9 ont perdu leur visuel.

Autrement dit : ce n'était ni aléatoire, ni lié au moment de l'import. C'était
la dépendance à Drive.

## Ce qui a été fait

**Tous vos visuels sont désormais hébergés sur l'infrastructure LAVEIYE.**
Les 296 campagnes qui dépendaient encore de Google Drive ont été migrées le
26 août — il ne reste **aucune URL Drive** dans la bibliothèque. Concrètement :
supprimer ou restreindre un fichier Drive d'origine n'a plus aucun effet sur le
site. Le lien d'origine de chaque visuel migré est conservé en base, pour la
traçabilité.

Nous avons aussi :

- **Ajouté un filtre et des compteurs d'état** dans l'Éditeur en masse. Vous
  voyez d'un coup d'œil combien de visuels sont sécurisés, à sécuriser ou
  inaccessibles, et vous pouvez les afficher séparément.
- **Ajouté une action groupée** : sélectionner plusieurs campagnes — ou toutes
  celles d'un filtre — et sécuriser leurs visuels en une fois, sans ouvrir les
  fiches une par une.
- **Automatisé l'import CSV.** Le visuel est maintenant rapatrié dès l'import.
  Si un lien est mort, la campagne arrive en Brouillon et vous êtes prévenus,
  plutôt que d'être publiée avec un visuel fragile.
- **Mis en place un contrôle automatique quotidien** qui vérifie les visuels et
  signale toute anomalie. Vous n'aurez plus à découvrir une image manquante en
  consultant le site.
- **Relevé la limite d'upload de 2 Mo à 10 Mo.** Cette limite venait de la
  configuration du stockage, et elle aurait fait échouer une partie de la
  migration.
- **Optimisé le poids de la bibliothèque.** Toutes les vignettes sont désormais
  converties au format WebP et limitées à 580 pixels de large — la taille
  d'affichage réelle sur le site — et les images de galerie à 1200 pixels. Même
  traitement automatique pour chaque nouvel upload. Résultat concret : le
  stockage des visuels est passé de plus de 700 Mo à environ 35 Mo, sans
  différence visible à l'écran, et les grilles de campagnes se chargent plus
  vite.
- **Encadré les vidéos.** L'admin affiche désormais les limites (format WebM
  recommandé, résolution 640×480 maximum) avant tout upload, refuse les
  fichiers trop grands avec un message clair, et propose une aide pas à pas
  pour convertir une vidéo avec CloudConvert ou HandBrake.

## Une seconde passe, au-delà de votre brief

En vérifiant que plus aucun visuel n'échappait au dispositif, nous avons trouvé
un problème d'un autre ordre — et plus coûteux pour vos visiteurs.

**Votre logo était un fichier de 10 000 pixels de côté.** Il s'affiche à environ
200 pixels sur le site, et il est chargé sur *chaque* page. Le fichier était
pourtant parfaitement valide et bien compressé : c'est exactement pour cela que
personne ne l'avait remarqué. Le coût n'était pas dans son poids de
téléchargement, mais dans la mémoire que le navigateur doit mobiliser pour le
décoder — de l'ordre de 400 Mo, à chaque page, y compris sur un téléphone.
L'icône de l'onglet posait le même problème, à 8 779 pixels de côté.

Nous avons donc étendu le chantier :

- **Logos et icône du site** ramenés à leur taille utile : 552 Ko → 17 Ko.
- **Visuels des temps forts** : ils étaient stockés dans le code du site, à
  environ 2 Mo chacun, et servis tels quels. Ils sont maintenant hébergés comme
  le reste des visuels, entre 49 et 194 Ko — et surtout, **vous pouvez les
  remplacer depuis l'administration sans attendre une mise en ligne**.
- **Nettoyage des fichiers du site** : 29 Mo ramenés à 0,6 Mo, dont 13 Mo de
  fichiers qui n'étaient plus utilisés nulle part.
- **Bannières, temps forts, couvertures d'étude, avatars et Studio Pub** entrent
  désormais dans le dispositif de normalisation automatique. Ce périmètre était
  volontairement laissé de côté lors de la première passe.

**Au total, environ 27 Mo ne sont plus envoyés à vos visiteurs**, et la
bibliothèque de visuels ne contient plus un seul fichier au format PNG ou JPEG :
865 fichiers, tous en WebP.

## Ce qui reste de votre côté

**9 campagnes ont définitivement perdu leur visuel.** Leur fichier Drive
d'origine a été supprimé — il n'y a rien à récupérer, ni de notre côté ni du
vôtre. Elles ont besoin d'un nouveau visuel, à déposer directement dans
l'Éditeur en masse via le bouton *Éditer → Remplacer*.

| Campagne | Marque | Statut actuel |
|---|---|---|
| MTN Cameroun | MTN Cameroun | Publiée |
| MTN Nigeria | MTN | Publiée |
| MTN Ghana | MTN Ghana | Publiée |
| MTN Ghana (2) | MTN Ghana | Publiée |
| Orange Sénégal | Orange Sénégal | Publiée |
| Orange Sénégal (2) | Orange Sénégal | Publiée |
| Orange Côte d'Ivoire | Orange Côte d'Ivoire | Publiée |
| Star Nigeria | Star Nigeria | Publiée |
| Coca Cola Ghana | Coca Cola Ghana | Brouillon |

Ces campagnes restent visibles sur le site en attendant, avec une vignette de
remplacement. Vous les retrouvez en une manipulation : Éditeur en masse, filtre
**État du média → Inaccessible**.

Toutes viennent du même import du 2 juin. Il est probable qu'un dossier Drive
ait été supprimé ou déplacé après coup — cela peut valoir la peine de vérifier
de votre côté si les fichiers existent encore ailleurs.

## Ce qui ne change pas

**Rien pour l'équipe contenu.** Le format du CSV est identique, la préparation
des campagnes ne change pas. Google Drive reste tout à fait utilisable comme
espace de travail et comme source d'import — simplement, il ne sert plus à
afficher les images sur le site.

Nous restons disponibles pour un point si vous souhaitez qu'on parcoure
l'interface ensemble.

Bien à vous,

Jean Luc
