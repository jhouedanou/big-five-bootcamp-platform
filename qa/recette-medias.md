# Recette des médias — Laveiye

> **Le support de recette de référence est `qa/recette-tracking.xlsx`**, importé
> dans Google Sheets par les testeurs. Les contrôles de ce document y sont
> consignés sous les numéros **44 à 66** (onglet « Contrôles transversaux »,
> section « Sécurisation des médias »), le constat du §1 dans l'onglet « Avant de
> commencer », et les exceptions dans « À ne pas signaler ». Les contrôles
> 63 à 66 couvrent l'optimisation ajoutée en cours de chantier : vignettes
> WebP 580 px, galeries WebP 1200 px, purge des orphelins du bucket, et
> limites vidéo (WebM recommandé, 640×480 max, modale d'aide à la conversion).
>
> Ce fichier reste le document source : il porte le raisonnement complet et le
> détail que le format tableur ne peut pas tenir. En cas d'écart, le classeur
> fait foi.

Branche : `seo`
Référence : *Brief fonctionnel / technique — Sécurisation et hébergement des médias LAVEIYE*, août 2026
Version du document : 26/08/2026

## À qui s'adresse ce document

À la personne qui va **vérifier** que les visuels sont sécurisés — pas à celle
qui a développé. Chaque contrôle dit quoi faire, ce qui doit se produire, et où
le constater. Si un contrôle échoue, la ligne indique quoi rapporter.

---

## 1. Ce qui a été constaté

Cette section est le cœur de la recette : elle documente la cause réelle de la
panne. Sans elle, les contrôles qui suivent ressemblent à des vérifications
arbitraires.

**Les deux campagnes de la capture client viennent du même import du 2 juin
2026.** La différence n'est pas l'import : **33 Export** avait été migrée vers
Supabase lors de la remédiation de juin, **MTN Cameroun** est restée sur Drive.
Sur les 38 campagnes de ce jour-là, les 20 migrées vont toutes bien ; sur les 18
laissées sur Drive, **9 sont mortes**.

**Et ce n'est pas une erreur 403.** Ces URLs renvoient **`HTTP 200` accompagné de
la page de connexion Google**, donc du HTML là où le navigateur attend une image
— c'est précisément pourquoi la plateforme ne les a jamais signalées. Le fichier
Drive source a été supprimé : le repli `uc?export=download` renvoie **404** sur
les 9.

**L'hypothèse d'un aléa** (quota, limitation, charge) **a été écartée par la
mesure** : deux passages complets sur les 296 visuels vivants à dix minutes
d'intervalle, **zéro bascule** ; rafale de trois passages sur quarante d'entre
eux, zéro bascule également. La panne est déterministe, fichier par fichier.

### État de la bibliothèque au 26/08/2026

| État | Nombre |
|---|---|
| Sécurisés (stockage LAVEIYE) | 522 |
| À sécuriser (URL externe encore vivante) | 296 |
| Inaccessibles (fichier source supprimé) | 9 |
| Sans visuel | 6 |
| **Total** | **833** |

### Les 9 campagnes inaccessibles

Toutes créées le **2026-06-02**, toutes issues du même lot d'import.
Aucune n'est récupérable automatiquement : on ne restaure pas un fichier qui
n'existe plus.

| Slug | Marque | Statut | Réponse de l'URL | Repli Drive |
|---|---|---|---|---|
| `mtn-cameroun` | MTN Cameroun | Publié | 200 · text/html | 404 |
| `mtn` | MTN Nigeria | Publié | 200 · text/html | 404 |
| `mtn-ghana` | MTN Ghana | Publié | 200 · text/html | 404 |
| `mtn-ghana-2` | MTN Ghana | Publié | 200 · text/html | 404 |
| `orange-senegal` | Orange Sénégal | Publié | 200 · text/html | 404 |
| `orange-senegal-2` | Orange Sénégal | Publié | 200 · text/html | 404 |
| `orange-cote-divoire` | Orange Côte d'Ivoire | Publié | 200 · text/html | 404 |
| `star-nigeria` | Star Nigeria | Publié | 200 · text/html | 404 |
| `coca-cola-ghana` | Coca Cola Ghana | Brouillon | 200 · text/html | 404 |

---

## 2. Avant de commencer

- Un compte **administrateur**, et l'accès à `/admin/bulk-editor`.
- La migration SQL `21_20260826_campaigns_media_status.sql` **doit être
  appliquée** avant toute recette. Sans elle, l'Éditeur en masse ne charge pas :
  les colonnes d'état n'existent pas.
- Un profil de navigateur neuf, ou au minimum le cache vidé — plusieurs
  contrôles portent sur l'affichage d'images.
- Une image de test **PNG de 5 Mo** (le contrôle 3.2 en a besoin).

Un mot sur le vocabulaire : le brief parle de vert / orange / rouge. Dans
l'interface, cela se lit **Sécurisé** / **À sécuriser** / **Inaccessible**.

---

## 3. Contrôles — stockage

### 3.1 La limite de taille du bucket a été relevée

**Faire** : téléverser une image de plus de 2 Mo via *Éditer → Remplacer* sur
n'importe quelle campagne de l'Éditeur en masse.

**Doit se produire** : l'upload réussit. Le bouton annonce « Remplacer (upload
≤ 10 Mo) », plus 2 Mo.

**Si ça échoue** : rapporter le message d'erreur exact. Une erreur mentionnant
« exceeded the maximum allowed size » signifie que le bucket n'a pas été
réaligné — le rapporter tel quel.

### 3.2 Le message d'erreur correspond à la limite réelle

**Faire** : tenter de téléverser une image de plus de 10 Mo.

**Doit se produire** : refus immédiat avec « Le fichier est trop volumineux
(maximum 10 Mo) ». Le refus doit venir de l'application, pas du stockage.

**À ne pas signaler** : le refus lui-même est le comportement attendu.

### 3.3 Les formats acceptés

**Faire** : téléverser successivement un JPG, un PNG et un WebP.

**Doit se produire** : les trois passent. Un SVG doit être refusé — c'est
volontaire, un SVG sur un stockage public peut porter du script.

---

## 4. Contrôles — détection

Le contrôle décisif de cette recette.

### 4.1 Un visuel mort est bien classé « Inaccessible »

**Faire** : dans l'Éditeur en masse, chercher `mtn-cameroun`. Ouvrir *Éditer*,
puis cliquer sur **Vérifier l'accès & sécuriser**.

**Doit se produire** : un message d'erreur explicite indiquant que l'URL répond
mais ne renvoie pas une image, et que le visuel doit être réuploadé. La pastille
reste **Inaccessible**.

**Ne doit surtout pas se produire** : que l'opération réussisse et fasse passer
la campagne en **Sécurisé**. C'était le comportement avant correction — la page
de connexion Google était enregistrée comme si c'était l'image.

### 4.2 Rien n'a été déposé dans le stockage

**Faire** : après le contrôle 4.1, ouvrir Supabase → Storage → bucket `shoo` →
dossier `thumbnails`, trier par date de création décroissante.

**Doit se produire** : aucun fichier nouvellement créé. Le contrôle 4.1 ne
téléverse rien.

**Si un fichier apparaît** : l'ouvrir. S'il s'agit d'une page HTML servie en
`.jpg`, le rapporter immédiatement — c'est le défaut d'origine, non corrigé.

### 4.3 Le diagnostic se lit d'un coup d'œil

**Faire** : filtrer sur la marque, puis afficher `33-export` et `mtn-cameroun`.

**Doit se produire** : la première porte la pastille **Sécurisé** (verte), la
seconde **Inaccessible** (rouge). Les deux ont la même date de création.

C'est la démonstration visuelle du constat du §1 : même import, sorts opposés,
et la migration est ce qui les sépare.

---

## 5. Contrôles — Éditeur en masse

### 5.1 Le filtre par état

**Faire** : utiliser le sélecteur **État du média**.

**Doit se produire** :
- *Inaccessible* → les 9 campagnes du tableau du §1, et elles seules ;
- *À sécuriser* → 296 avant migration, 0 après ;
- *Sécurisé* → 522 avant migration, 818 après.

### 5.2 Les compteurs

**Doit se produire** : le bandeau « État des visuels » affiche les mêmes nombres
que les filtres. Avant migration : **522 sécurisés / 296 à sécuriser / 9
inaccessibles**.

**Où le constater** : bandeau gris sous la barre de filtres.

### 5.3 La sélection de tout un filtre

**Faire** : filtrer sur *À sécuriser*, puis cliquer « Sélectionner les N
campagnes du filtre ».

**Doit se produire** : la barre d'actions annonce le même nombre. Il ne doit pas
être nécessaire de faire défiler la liste pour tout sélectionner.

### 5.4 L'action groupée

**Faire** : sélectionner une dizaine de campagnes *À sécuriser*, puis
« Sécuriser les médias sélectionnés ».

**Doit se produire** : un avancement chiffré s'affiche pendant le traitement,
puis un récapitulatif de la forme « 10 médias sélectionnés — 10 sécurisés avec
succès — 0 impossible à récupérer ».

**Si ça échoue** : rapporter le récapitulatif complet et le motif affiché.

### 5.5 La liste d'exceptions

**Faire** : sélectionner les 9 campagnes *Inaccessible*, puis lancer la
sécurisation.

**Doit se produire** : « 9 sélectionnés — 0 sécurisé — 9 impossibles à
récupérer », avec le motif ligne par ligne et un bouton d'export CSV.

**Doit se produire aussi** : le fichier CSV téléchargé contient les 9 slugs,
leurs titres, l'URL d'origine et le motif. C'est ce fichier qui part à l'équipe
contenu.

### 5.6 L'état survit au rechargement

**Faire** : après un audit, recharger la page (F5).

**Doit se produire** : les pastilles et les compteurs sont inchangés. L'état est
enregistré en base, il n'est pas recalculé à l'affichage.

---

## 6. Contrôles — migration

### 6.1 Plus aucune dépendance externe

**Faire** : après la migration complète, exécuter dans le SQL Editor :

```sql
select count(*) from campaigns
where thumbnail ilike '%googleusercontent%'
   or thumbnail ilike '%drive.google%';
```

**Doit se produire** : le résultat est **0**.

### 6.2 Le test décisif du brief

**Faire** : prendre une campagne migrée, retrouver son fichier Drive d'origine
(colonne `media_source_url`), et **retirer son partage public** dans Drive.
Recharger la fiche de la campagne sur le site.

**Doit se produire** : le visuel s'affiche toujours. C'est le critère central du
brief : couper la source ne casse plus le média migré.

### 6.3 La trace de l'origine est conservée

**Faire** : sur une campagne migrée, vérifier la colonne `media_source_url`.

**Doit se produire** : elle contient l'ancienne URL. Sans elle, la migration
serait irréversible.

### 6.4 Un visuel cassé n'affiche plus d'icône brisée

**Faire** : consulter la bibliothèque et le tableau de bord avec l'une des 9
campagnes non encore réuploadées.

**Doit se produire** : un visuel de remplacement ou les initiales de la
campagne. Jamais l'icône d'image brisée du navigateur.

---

## 7. Contrôles — import CSV

### 7.1 Un lien vivant est rapatrié

**Faire** : importer un CSV de 3 lignes dont la colonne `imageUrl` contient des
liens Drive publics.

**Doit se produire** : les 3 campagnes sont créées, un avancement s'affiche
pendant le traitement, et leurs visuels pointent sur le domaine Supabase — pas
sur Drive. Leur pastille est **Sécurisé**.

**Où le constater** : Éditeur en masse, filtre *Sécurisé*, tri par date.

### 7.2 Un lien mort ne publie pas

**Faire** : importer une ligne dont `imageUrl` pointe sur un fichier supprimé
(réutiliser l'URL de `mtn-cameroun`).

**Doit se produire** : la campagne est créée en **Brouillon**, sa pastille est
**Inaccessible**, et le motif remonte dans la liste d'erreurs affichée après
l'import.

**Ne doit pas se produire** : que la campagne soit publiée avec un visuel
fragile. C'est l'exigence du §6 du brief.

### 7.3 Le format du CSV n'a pas changé

**Faire** : réutiliser un CSV existant de l'équipe contenu, sans le modifier.

**Doit se produire** : il s'importe normalement. Aucune colonne nouvelle n'est
requise.

---

## 8. Contrôle préventif

### 8.1 La tâche planifiée

**Faire** : appeler manuellement `/api/cron/media-health` avec l'en-tête
`Authorization: Bearer <CRON_SECRET>`.

**Doit se produire** : une réponse JSON indiquant le nombre de visuels
contrôlés, ceux encore valides, et ceux devenus inaccessibles.

**Sans l'en-tête** : la route doit répondre `401`.

### 8.2 Une bascule est bien détectée

**Faire** : modifier à la main la valeur de `thumbnail` d'une campagne de test
pour une URL inexistante, puis relancer la tâche.

**Doit se produire** : la campagne passe en **Inaccessible**, avec un motif, et
son slug apparaît dans la réponse de la tâche.

---

## 9. Deux outils pour trancher sans l'interface

Utiles quand un contrôle échoue et qu'il faut savoir si le défaut vient du site
ou du fichier source. Les deux sont en lecture seule côté base.

### `npx tsx scripts/verify-media-guard.ts`

Prend trois campagnes témoins et affiche, pour chacune, le code de réponse, le
type annoncé et le type réellement déduit des octets. C'est la démonstration
directe du §1 : `mtn-cameroun` répond `200` avec un en-tête `text/html` et
ressort **REJETÉ**, là où `33-export` et un visuel Drive vivant ressortent
**IMAGE**.

### `npx tsx scripts/dry-run-securisation.ts [nombre]`

Rejoue la chaîne complète de sécurisation sur un échantillon — téléchargement,
contrôle des octets, dépôt réel dans le bucket, vérification que l'URL produite
sert bien une image — **puis supprime les fichiers d'essai**. La base n'est
jamais modifiée.

Résultat de référence du 26/08/2026 sur 10 campagnes : 8 sécurisables, 2
rejetées (`mtn-cameroun`, `orange-senegal`), 0 échec.

---

## 10. À ne pas signaler

- **Les 9 campagnes inaccessibles du §1** tant qu'elles n'ont pas été
  réuploadées par l'équipe contenu. Elles restent publiées : c'est le choix
  retenu, elles ne disparaissent pas du catalogue.
- **Les 6 campagnes sans visuel** : le champ est vide en base, ce n'est pas une
  panne.
- **Le refus des SVG et des PDF** à l'upload : volontaire.
- **La lenteur de l'audit sur toute la bibliothèque** : chaque visuel demande un
  aller-retour réseau, comptez environ 90 secondes pour les 833. L'avancement
  s'affiche.
- **Le bucket `avatars`**, public et sans restriction : repéré au passage, hors
  périmètre de ce brief, traité séparément.
