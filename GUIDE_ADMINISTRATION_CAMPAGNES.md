# 📚 Guide d'Administration - Gestion des Campagnes

Ce guide détaille comment ajouter, modifier et gérer les campagnes publicitaires via l'interface d'administration de Big Five Bootcamp Platform.

---

## Table des matières

1. [Accès à l'administration](#1-accès-à-ladministration)
2. [Vue d'ensemble de la page Campagnes](#2-vue-densemble-de-la-page-campagnes)
3. [Ajouter une nouvelle campagne](#3-ajouter-une-nouvelle-campagne)
4. [Modifier une campagne existante](#4-modifier-une-campagne-existante)
5. [Publier/Dépublier une campagne](#5-publierdépublier-une-campagne)
6. [Supprimer une campagne](#6-supprimer-une-campagne)
7. [Importer des campagnes par CSV](#7-importer-des-campagnes-par-csv)
8. [Bonnes pratiques](#8-bonnes-pratiques)
9. [Dépannage](#9-dépannage)

---

## 1. Accès à l'administration

### Prérequis
- Avoir un compte administrateur
- Être connecté à la plateforme

### URL d'accès
```
https://v0-big-five-bootcamp-platform.vercel.app/login
```

### Comptes administrateurs autorisés
Les emails suivants ont accès à l'administration :
- `jeanluc@bigfiveabidjan.com`
- `cossi@bigfiveabidjan.com`
- `yannick@bigfiveabidjan.com`
- `franck@bigfiveabidjan.com`
- `stephanie@bigfiveabidjan.com`
Votre mot de passe a été envoyé par message message
### Navigation vers les campagnes
1. Connectez-vous à l'administration
2. Dans le menu latéral, cliquez sur **"Campagnes"** ou **"Exemples de Campagnes"**
3. Vous arrivez sur la page `/admin/campaigns`

---

## 2. Vue d'ensemble de la page Campagnes

### Interface principale

```
┌─────────────────────────────────────────────────────────────────┐
│  Exemples de Campagnes                    [Importer CSV] [+ Ajouter]│
│  Gérez les exemples de campagnes (X campagnes)                  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Rechercher...                    [Filtrer par secteur ▼]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────┐ Titre de la campagne                            [⋮]   │
│  │ img │ Marque - Agence                                        │
│  └─────┘ [● Publié] [👑 Premium] [Telecoms] [🌍 CI] [FB] [Video]│
│          #tag1 #tag2 #tag3                                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────┐ Autre campagne                                  [⋮]   │
│  │ img │ Marque - Agence                                        │
│  └─────┘ [○ Brouillon] [👥 Gratuit] [E-commerce] [🌍 SN]        │
└─────────────────────────────────────────────────────────────────┘
```

### Éléments visibles pour chaque campagne

| Élément | Description |
|---------|-------------|
| **Miniature** | Image principale de la campagne (64x64 px) |
| **Titre** | Nom de la campagne |
| **Marque / Agence** | Informations sur le client et l'agence créative |
| **Statut** | 🟢 Publié, 🟡 En attente, ⚪ Brouillon |
| **Niveau d'accès** | 👑 Premium (abonnés) ou 👥 Gratuit (tous) |
| **Secteur** | Telecoms, E-commerce, Banque/Finance, etc. |
| **Pays** | Côte d'Ivoire, Sénégal, Nigeria, etc. |
| **Plateforme** | Facebook, Instagram, TikTok, YouTube, etc. |
| **Format** | Video Ad, Story, Carousel, Post Social, Campagne 360 |
| **Tags** | Mots-clés personnalisés |

### Filtres disponibles
- **Recherche** : Filtrer par titre, marque ou agence
- **Secteur** : Filtrer par secteur d'activité

---

## 3. Ajouter une nouvelle campagne

### Méthode 1 : Bouton "Ajouter"
1. Cliquez sur le bouton **"+ Ajouter une campagne"** (orange, en haut à droite)

### Méthode 2 : URL directe
Accédez à :
```
/admin/campaigns?action=new
```

### Le formulaire en 3 étapes

Le formulaire d'ajout de campagne est divisé en **3 étapes** pour une meilleure organisation :

```
[ 1. Informations ✓ ]────[ 2. Médias ]────[ 3. Description ]
```

---

### 📝 Étape 1 : Informations de base

| Champ | Obligatoire | Description | Exemple |
|-------|-------------|-------------|---------|
| **Titre** | ✅ Oui | Nom de la campagne | "MTN Ghana - Mobile Money Campaign" |
| **Marque** | Non | Nom de l'annonceur | "MTN" |
| **Agence** | Non | Agence créative | "Ogilvy Africa" |
| **Plateforme** | Oui | Réseau social principal | Facebook, Instagram, TikTok, YouTube, LinkedIn, Twitter/X |
| **Pays** | Oui | Pays de diffusion | Côte d'Ivoire, Nigeria, Kenya, Ghana, Sénégal, Maroc, Afrique du Sud |
| **Secteur** | Oui | Secteur d'activité | Telecoms, E-commerce, Banque/Finance, FMCG, Tech, Energie, Industrie |
| **Format** | Oui | Type de contenu | Video Ad, Story, Carousel, Post Social, Campagne 360 |
| **Date** | Non | Période de diffusion | "Jan 2024" |
| **Année** | Oui | Année de la campagne | 2024 |
| **Statut** | Oui | État de publication | Brouillon, En attente, Publié |
| **Niveau d'accès** | Oui | Visibilité | Gratuit (tous) ou Premium (abonnés uniquement) |

#### Comprendre le niveau d'accès

| Niveau | Icône | Qui peut voir ? | Page Démo |
|--------|-------|-----------------|-----------|
| **Gratuit** | 👥 | Tous les visiteurs | ✅ Visible |
| **Premium** | 👑 | Utilisateurs abonnés uniquement | ❌ Masqué |

> 💡 **Astuce** : Utilisez "Premium" pour vos meilleures campagnes afin d'inciter les visiteurs à s'abonner.

---

### 🖼️ Étape 2 : Médias (Images et Vidéos)

#### Image principale (Thumbnail)
C'est l'image qui apparaît dans les listes et les cartes.

```
┌─────────────────────────────────────────────────────┐
│  Image principale (thumbnail) *                      │
│  [https://images.unsplash.com/photo-xxx...        ] │
│                                                      │
│  ┌──────────┐                                        │
│  │   📷     │  ← Prévisualisation                   │
│  │  Image   │                                        │
│  └──────────┘                                        │
└─────────────────────────────────────────────────────┘
```

**Recommandations :**
- Format : JPG ou PNG
- Ratio : 16:9 (paysage) ou 9:16 (portrait/Reels)
- Taille : au moins 800x450 px (paysage) ou 450x800 px (portrait)
- Sources : Unsplash, Cloudinary, ou votre hébergement

---

### 🎯 Comment récupérer les thumbnails depuis les réseaux sociaux

#### Méthode recommandée : ThumbDownloader.com

Pour récupérer facilement les images miniatures des vidéos Facebook, Instagram, TikTok, etc. :

1. **Allez sur** 👉 [https://www.thumbdownloader.com/](https://www.thumbdownloader.com/)
2. **Collez l'URL** de la vidéo ou du Reel (Facebook, Instagram, TikTok, YouTube)
3. **Cliquez sur "Download"**
4. **Faites clic droit** sur l'image affichée → **"Copier l'adresse de l'image"**
5. **Collez** cette URL dans le champ thumbnail de votre créative

#### Autres méthodes selon la plateforme

| Plateforme | Méthode |
|------------|---------|
| **YouTube** | Utilisez `https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg` |
| **Facebook** | ThumbDownloader.com ou capture d'écran + hébergement sur ImgBB |
| **Instagram** | ThumbDownloader.com (les URLs directes Instagram expirent) |
| **TikTok** | ThumbDownloader.com |

#### Hébergement d'images (URLs permanentes)

Si l'URL de l'image expire, hébergez-la sur :
- **[ImgBB](https://imgbb.com/)** - Gratuit, pas de compte requis
- **[Imgur](https://imgur.com/)** - Gratuit, liens permanents
- **[Cloudinary](https://cloudinary.com/)** - Gratuit jusqu'à 25GB

---

#### Images supplémentaires (Galerie)

Vous pouvez ajouter plusieurs images pour créer une galerie avec lightbox.

```
┌─────────────────────────────────────────────────────────────────┐
│  Visuels supplémentaires (carousel)           3 images ajoutées │
├─────────────────────────────────────────────────────────────────┤
│  ┌────┐ #1 [https://example.com/image1.jpg    ] [↑][↓][✗]      │
│  │ 📷 │                                                         │
│  └────┘                                                         │
│  ┌────┐ #2 [https://example.com/image2.jpg    ] [↑][↓][✗]      │
│  │ 📷 │                                                         │
│  └────┘                                                         │
│  ┌────┐ #3 [https://example.com/image3.jpg    ] [↑][↓][✗]      │
│  │ 📷 │                                                         │
│  └────┘                                                         │
├─────────────────────────────────────────────────────────────────┤
│  [Coller URL...                              ] [+ Ajouter]      │
│  [     + Ajouter un champ image (champ vide)              ]     │
│                                                                  │
│  💡 Astuce : Ajoutez plusieurs images pour créer un carousel    │
└─────────────────────────────────────────────────────────────────┘
```

**Actions disponibles :**
| Bouton | Action |
|--------|--------|
| ↑ | Monter l'image dans l'ordre |
| ↓ | Descendre l'image dans l'ordre |
| ✗ | Supprimer l'image |
| + Ajouter | Ajouter une image via URL |
| + Ajouter un champ | Créer un champ vide pour saisir l'URL |

#### Vidéo YouTube

```
┌─────────────────────────────────────────────────────────────────┐
│  🎬 URL de la vidéo YouTube                                     │
│  [https://www.youtube.com/watch?v=dQw4w9WgXcQ              ]   │
│                                                                  │
│  💡 Collez simplement le lien YouTube - il sera automatiquement │
│     converti en format embed.                                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                   📹 Aperçu vidéo                       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ☑ Cette campagne contient une vidéo                           │
└─────────────────────────────────────────────────────────────────┘
```

**Formats d'URL YouTube acceptés :**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID` (déjà en embed)

> ⚠️ **Important** : Pas besoin de convertir manuellement ! Collez simplement le lien YouTube tel quel.

---

### 🎬 Vidéos Facebook, Instagram, TikTok

#### Formats d'URL supportés

| Plateforme | Format d'URL | Exemple |
|------------|--------------|---------|
| **Facebook Watch** | `facebook.com/watch/?v=ID` | `https://www.facebook.com/watch/?v=123456789` |
| **Facebook Videos** | `facebook.com/PAGE/videos/ID` | `https://www.facebook.com/coca-cola/videos/123456789` |
| **Facebook Reels** | `facebook.com/reel/ID` | `https://www.facebook.com/reel/123456789` |
| **Instagram Reels** | `instagram.com/reel/CODE` | `https://www.instagram.com/reel/ABC123xyz/` |
| **Instagram Posts** | `instagram.com/p/CODE` | `https://www.instagram.com/p/ABC123xyz/` |
| **TikTok** | `tiktok.com/@user/video/ID` | `https://www.tiktok.com/@username/video/123456789` |

#### ⚠️ Note importante sur les vidéos Facebook

Les vidéos Facebook peuvent parfois ne pas s'afficher correctement en embed. Si vous rencontrez des problèmes :

1. **Vérifiez que la vidéo est publique** (pas en mode "Amis uniquement")
2. **Utilisez le format d'URL correct** (voir tableau ci-dessus)
3. **Alternative recommandée** : Téléchargez la vidéo et uploadez-la sur YouTube (non répertorié), puis utilisez le lien YouTube

---

### ✍️ Étape 3 : Description et Tags

#### Éditeur de description

L'éditeur WYSIWYG (What You See Is What You Get) permet de formater votre texte :

```
┌─────────────────────────────────────────────────────────────────┐
│  [B] [I] [U] [🔗] [📋] [•] [1.] [H1] [H2]                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Décrivez la campagne, son contexte, ses résultats...          │
│                                                                  │
│  Cette campagne a été lancée en janvier 2024 pour promouvoir   │
│  le nouveau service Mobile Money de MTN Ghana.                  │
│                                                                  │
│  **Résultats clés :**                                           │
│  • +45% de téléchargements de l'app                            │
│  • 2.5M de vues sur les réseaux sociaux                        │
│  • Taux d'engagement de 8.2%                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fonctionnalités de l'éditeur :**
| Bouton | Action |
|--------|--------|
| **B** | Texte en gras |
| *I* | Texte en italique |
| U | Texte souligné |
| 🔗 | Insérer un lien |
| 📋 | Coller du texte |
| • | Liste à puces |
| 1. | Liste numérotée |
| H1/H2 | Titres |

#### Tags

```
┌─────────────────────────────────────────────────────────────────┐
│  Tags                                                           │
│  [Ajouter un tag...                         ] [+]              │
│                                                                  │
│  [Mobile Money ✗] [Afrique ✗] [Innovation ✗] [Telecoms ✗]      │
└─────────────────────────────────────────────────────────────────┘
```

**Comment ajouter des tags :**
1. Tapez le nom du tag dans le champ
2. Appuyez sur **Entrée** ou cliquez sur **+**
3. Le tag apparaît en dessous
4. Cliquez sur ✗ pour supprimer un tag

**Suggestions de tags :**
- Par secteur : `Telecoms`, `Fintech`, `FMCG`, `Retail`
- Par type : `Branding`, `Performance`, `Awareness`, `Activation`
- Par thème : `Innovation`, `Durabilité`, `Mobile First`, `UGC`
- Par résultat : `Award Winner`, `Viral`, `Record`

---

### Enregistrer la campagne

Une fois toutes les étapes complétées :

1. **Navigation entre étapes :**
   - Cliquez sur **"Suivant"** pour avancer
   - Cliquez sur **"Précédent"** pour revenir
   - Cliquez directement sur un numéro d'étape pour y accéder

2. **Enregistrement :**
   - À l'étape 3, cliquez sur **"Enregistrer"**
   - La campagne est créée avec le statut choisi
   - Vous êtes redirigé vers la liste des campagnes

```
┌─────────────────────────────────────────────────────────────────┐
│                                      [Précédent] [Enregistrer]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Modifier une campagne existante

### Accéder à la modification

1. Trouvez la campagne dans la liste
2. Cliquez sur le menu **⋮** (trois points) à droite
3. Sélectionnez **"Modifier"**

```
┌───────────────┐
│ 👁 Aperçu     │
│ 📤 Publier    │
│ ✏️ Modifier  │ ← Cliquez ici
│ 🗑 Supprimer  │
└───────────────┘
```

### Formulaire de modification

Le même formulaire en 3 étapes s'ouvre avec les données existantes pré-remplies.

1. Modifiez les champs souhaités
2. Naviguez entre les étapes si nécessaire
3. Cliquez sur **"Enregistrer"** pour sauvegarder

> 💡 **Note** : Les modifications sont enregistrées immédiatement dans la base de données.

---

## 5. Publier/Dépublier une campagne

### Publication rapide

1. Cliquez sur le menu **⋮** de la campagne
2. Sélectionnez :
   - **"Publier"** si la campagne est en brouillon
   - **"Dépublier"** si elle est déjà publiée

### États de publication

| État | Badge | Visible publiquement |
|------|-------|---------------------|
| **Brouillon** | ⚪ Brouillon | ❌ Non |
| **En attente** | 🟡 En attente | ❌ Non |
| **Publié** | 🟢 Publié | ✅ Oui |

### Workflow recommandé

```
[Brouillon] → [En attente] → [Publié]
     ↑              ↓              ↓
     └──────────────┴──────────────┘
           (Dépublication)
```

1. **Brouillon** : Travail en cours, pas terminé
2. **En attente** : Prêt pour révision/validation
3. **Publié** : Visible par les utilisateurs

---

## 6. Supprimer une campagne

### Procédure

1. Cliquez sur le menu **⋮** de la campagne
2. Sélectionnez **"Supprimer"** (en rouge)
3. Confirmez la suppression

> ⚠️ **Attention** : La suppression est définitive ! Il n'y a pas de corbeille.

### Conseil

Avant de supprimer, envisagez de **dépublier** la campagne. Cela la rend invisible sans la perdre.

---

## 7. Importer des campagnes par CSV

### Accéder à l'import

Cliquez sur le bouton **"Importer CSV"** en haut de la page.

### Format du fichier CSV

```csv
title,brand,agency,platform,country,sector,format,date,year,imageUrl,videoUrl,description,tags,status,accessLevel
"MTN Campaign","MTN","Ogilvy","Facebook","Ghana","Telecoms","Video Ad","Jan 2024",2024,"https://...","https://youtube.com/...","Description...","tag1;tag2;tag3","Publié","free"
```

### Colonnes du CSV

| Colonne | Obligatoire | Valeurs acceptées |
|---------|-------------|-------------------|
| title | ✅ | Texte libre |
| brand | Non | Texte libre |
| agency | Non | Texte libre |
| platform | Oui | Facebook, Instagram, TikTok, YouTube, LinkedIn, Twitter/X |
| country | Oui | Côte d'Ivoire, Nigeria, Kenya, Ghana, Sénégal, Maroc, Afrique du Sud |
| sector | Oui | Telecoms, E-commerce, Banque/Finance, FMCG, Tech, Energie, Industrie |
| format | Oui | Video Ad, Story, Carousel, Post Social, Campagne 360 |
| date | Non | Texte libre (ex: "Jan 2024") |
| year | Oui | Nombre (ex: 2024) |
| imageUrl | Non | URL complète |
| videoUrl | Non | URL YouTube |
| description | Non | Texte HTML accepté |
| tags | Non | Tags séparés par point-virgule (;) |
| status | Oui | Brouillon, En attente, Publié |
| accessLevel | Oui | free, premium |

### Exemple complet

```csv
title,brand,agency,platform,country,sector,format,date,year,imageUrl,videoUrl,description,tags,status,accessLevel
"Orange Money Launch","Orange","TBWA","Instagram","Côte d'Ivoire","Telecoms","Video Ad","Mars 2024",2024,"https://images.unsplash.com/photo-xxx","https://youtu.be/xxx","<p>Campagne de lancement Orange Money</p>","Mobile Money;Fintech;Award","Publié","premium"
"Coca-Cola Ramadan","Coca-Cola","McCann","Facebook","Sénégal","FMCG","Carousel","Avr 2024",2024,"https://images.unsplash.com/photo-yyy","","<p>Campagne spéciale Ramadan</p>","Ramadan;FMCG;Afrique","Publié","free"
```

---

## 8. Bonnes pratiques

### 📸 Images

| Aspect | Recommandation |
|--------|----------------|
| **Format** | JPG pour les photos, PNG pour les graphiques |
| **Taille** | 800x450 px minimum pour le thumbnail |
| **Hébergement** | Utilisez des CDN (Cloudinary, Imgix, Unsplash) |
| **Nommage** | URLs permanentes, pas de liens temporaires |

### 🎬 Vidéos

- ✅ Utilisez YouTube pour l'hébergement
- ✅ Vérifiez que la vidéo est en mode public ou non répertorié
- ❌ Évitez les vidéos privées
- ❌ Évitez les liens Vimeo protégés par mot de passe

### ✍️ Descriptions

- **Longueur idéale** : 150-300 mots
- **Structure** :
  1. Contexte de la campagne
  2. Objectifs
  3. Concept créatif
  4. Résultats / KPIs
- **Formatage** : Utilisez des listes et titres pour faciliter la lecture

### 🏷️ Tags

- **Nombre** : 3 à 7 tags par campagne
- **Cohérence** : Utilisez les mêmes tags pour des campagnes similaires
- **Spécificité** : Préférez "Mobile Money" à "Digital"

### 📊 Organisation

| Statut | Quand l'utiliser |
|--------|------------------|
| **Brouillon** | Campagne en cours de création |
| **En attente** | En attente de validation/assets |
| **Publié** | Prêt à être vu par les utilisateurs |
| **Premium** | Contenu exclusif pour les abonnés |

---

## 9. Dépannage

### Problème : "Le titre est obligatoire"

**Cause** : Le champ titre est vide.
**Solution** : Remplissez le champ titre à l'étape 1.

### Problème : L'image ne s'affiche pas

**Causes possibles** :
1. URL incorrecte ou cassée
2. Image hébergée sur un site qui bloque le hotlinking
3. CORS (Cross-Origin Resource Sharing) bloqué

**Solutions** :
1. Vérifiez l'URL en l'ouvrant dans un nouvel onglet
2. Utilisez des hébergeurs compatibles (Cloudinary, Imgix, Unsplash)
3. Téléchargez l'image et ré-hébergez-la

### Problème : La vidéo ne se charge pas

**Causes possibles** :
1. Vidéo YouTube privée
2. URL mal formatée
3. Vidéo supprimée

**Solutions** :
1. Vérifiez que la vidéo est publique ou non répertoriée
2. Copiez l'URL directement depuis la barre d'adresse YouTube
3. Testez l'URL dans un nouvel onglet

### Problème : La campagne ne s'affiche pas sur le site

**Vérifiez** :
1. ✅ Le statut est "Publié"
2. ✅ Si Premium, l'utilisateur est connecté et abonné
3. ✅ Rafraîchissez le cache du navigateur (Ctrl+F5)

### Problème : Erreur lors de l'enregistrement

**Actions** :
1. Vérifiez votre connexion internet
2. Vérifiez que vous êtes toujours connecté (session active)
3. Rechargez la page et réessayez
4. Consultez la console du navigateur (F12) pour plus de détails

---

## Raccourcis et astuces

### Navigation rapide

| Action | Raccourci/URL |
|--------|---------------|
| Liste des campagnes | `/admin/campaigns` |
| Ajouter une campagne | `/admin/campaigns?action=new` |
| Dashboard admin | `/admin` |

### Recherche efficace

- Recherchez par **titre** : tapez le nom de la campagne
- Recherchez par **marque** : tapez le nom de l'annonceur
- Recherchez par **agence** : tapez le nom de l'agence
- Filtrez par **secteur** : utilisez le menu déroulant

### Copier une campagne

Pour dupliquer une campagne :
1. Ouvrez la campagne en modification
2. Notez ou copiez les informations importantes
3. Annulez la modification
4. Créez une nouvelle campagne avec les mêmes infos
5. Modifiez ce qui doit être différent

---

## Support

Pour toute question ou problème :
- 📧 Email : support@bigfiveabidjan.com
- 📱 Slack : #big-five-platform

---

*Guide mis à jour le : Février 2026*
*Version de la plateforme : 1.0*
