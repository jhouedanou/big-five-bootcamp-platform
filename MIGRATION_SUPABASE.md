# 🔄 Migration vers Supabase - Documentation

## ✅ Ce qui a été fait

### 1. Schéma de base de données étendu

Le fichier `supabase-schema.sql` a été mis à jour avec :

#### Tables ajoutées :
- **`public.users`** - Profils utilisateurs (extend auth.users)
  - Champs : id, email, name, role, plan, status
  - Rôles : 'admin' | 'user'
  - Plans : 'Free' | 'Premium'
  
- **`campaigns`** - Campagnes marketing
  - Champs : title, description, brand, category, thumbnail, images[], video_url, platforms[], duration, target_audience, tags[], status, author_id
  - Statuts : 'Publié' | 'Brouillon' | 'En attente'

#### Tables bootcamp (déjà présentes) :
- `bootcamps` - Thématiques de bootcamp
- `sessions` - Sessions programmées
- `registrations` - Inscriptions participants

### 2. API Routes créées

#### `/api/campaigns`
- **GET** - Récupérer toutes les campagnes (avec filtres optionnels)
- **POST** - Créer une nouvelle campagne

#### `/api/campaigns/[id]`
- **GET** - Récupérer une campagne par ID
- **PATCH** - Mettre à jour une campagne
- **DELETE** - Supprimer une campagne

### 3. Authentification Supabase

#### Hook personnalisé : `hooks/use-supabase-auth.ts`
Fournit :
- `user` - User Supabase Auth
- `userProfile` - Profil complet depuis table users
- `isAuthenticated` - Boolean
- `isAdmin` - Boolean (role === 'admin')
- `signIn(email, password)` - Connexion
- `signUp(email, password, name)` - Inscription
- `signOut()` - Déconnexion
- `resetPassword(email)` - Réinitialisation mot de passe
- `updatePassword(newPassword)` - Changement mot de passe

#### Page d'authentification : `app/auth/page.tsx`
- Formulaire de connexion / inscription
- Toggle entre les deux modes
- Validation et messages d'erreur
- Redirection automatique après connexion

### 4. AdminContext migré

Le fichier `app/admin/AdminContext.tsx` a été mis à jour pour :
- Charger les campagnes depuis Supabase au lieu de localStorage
- Utiliser les API routes pour créer/modifier/supprimer
- Afficher des toasts de succès/erreur
- Conversion automatique des formats de données

#### Fonctions mises à jour :
- `loadCampaignsFromSupabase()` - Charge depuis Supabase
- `addCampaign()` - POST vers API
- `updateCampaign()` - PATCH vers API
- `deleteCampaign()` - DELETE vers API

### 5. Row Level Security (RLS)

#### Policies configurées :

**Users :**
- Users peuvent voir leur propre profil
- Users peuvent mettre à jour leur propre profil
- Admins peuvent tout gérer

**Campaigns :**
- Tout le monde voit les campagnes publiées
- Users authentifiés peuvent créer
- Users peuvent modifier leurs propres campagnes
- Admins peuvent tout gérer

**Bootcamps & Sessions :**
- Lecture publique
- Écriture admin seulement

**Registrations :**
- Création publique
- Lecture : propres inscriptions + admin

## 🎯 Prochaines étapes

### Étape 1 : Exécuter le schéma SQL (CRITIQUE)

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner le projet `jyycgendzegiazltvarx`
3. Aller dans **SQL Editor**
4. Copier TOUT le contenu de `supabase-schema.sql`
5. Coller et cliquer sur **RUN**

⚠️ **Important** : Le schéma a été étendu, il faut le ré-exécuter entièrement pour créer les nouvelles tables.

### Étape 2 : Configurer l'authentification Supabase

1. Dans Supabase Dashboard → **Authentication** → **Providers**
2. **Email** provider devrait déjà être activé
3. Configurer les URLs de redirection :
   - **Site URL** (Local): `http://localhost:3000`
   - **Site URL** (Production): `https://v0-big-five-bootcamp-platform.vercel.app`
   - **Redirect URLs**: 
     - `http://localhost:3000/auth/callback`
     - `https://v0-big-five-bootcamp-platform.vercel.app/auth/callback`
     - `http://localhost:3000/dashboard`
     - `https://v0-big-five-bootcamp-platform.vercel.app/dashboard`

4. Dans **Email Templates**, personnaliser les emails (optionnel) :
   - Confirmation d'inscription
   - Réinitialisation mot de passe
   - Magic Link

### Étape 3 : Créer le premier utilisateur admin

Deux options :

#### Option A : Via l'interface d'authentification Supabase
1. Aller sur `/auth` dans votre navigateur
2. Créer un compte avec votre email
3. Vérifier l'email de confirmation
4. Dans Supabase Dashboard → **Table Editor** → **users**
5. Trouver votre user et changer `role` de 'user' à 'admin'

#### Option B : Via SQL
```sql
-- Dans le SQL Editor de Supabase
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
VALUES (
  'admin@bigfive.com',
  crypt('votre-mot-de-passe-securise', gen_salt('bf')),
  NOW(),
  'authenticated'
);

-- Puis créer le profil
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@bigfive.com'),
  'admin@bigfive.com',
  'Admin Big Five',
  'admin',
  'Premium',
  'active'
);
```

### Étape 4 : Tester le système

1. **Tester la connexion Supabase**
   ```bash
   # En local
   http://localhost:3000/api/test-supabase
   
   # En production
   https://v0-big-five-bootcamp-platform.vercel.app/api/test-supabase
   ```

2. **Se connecter**
   - Local: Aller sur `http://localhost:3000/auth`
   - Production: Aller sur `https://v0-big-five-bootcamp-platform.vercel.app/auth`
   - Se connecter avec le compte admin
   - Vérifier la redirection vers `/dashboard`

3. **Tester les campagnes**
   - Aller sur `/admin/campaigns`
   - Créer une nouvelle campagne
   - Vérifier qu'elle apparaît dans la liste
   - La modifier
   - La supprimer

4. **Vérifier dans Supabase**
   - Aller dans **Table Editor** → **campaigns**
   - Les campagnes créées doivent apparaître

### Étape 5 : Migrer les données existantes (optionnel)

Si vous avez des campagnes dans localStorage à migrer :

```javascript
// Dans la console du navigateur
const campaigns = JSON.parse(localStorage.getItem('admin_campaigns') || '[]');
console.log(campaigns);

// Puis pour chaque campagne, faire un POST vers /api/campaigns
```

Ou créer un script de migration.

## 📋 Checklist avant mise en production

- [ ] Schéma SQL exécuté avec succès
- [ ] Tables `users` et `campaigns` visibles dans Table Editor
- [ ] Au moins 1 admin créé et testé
- [ ] Authentification fonctionne (signup, login, logout)
- [ ] Campagnes : création, modification, suppression OK
- [ ] RLS policies testées (user ne peut pas modifier campagne d'un autre)
- [ ] Variables d'environnement configurées dans Vercel
- [ ] URLs de redirection Supabase configurées pour production
- [ ] Tests de l'API `/api/test-supabase` OK (local + production)
- [ ] `NEXTAUTH_URL` mis à jour pour production
- [ ] `NEXTAUTH_SECRET` changé (différent de "bf5-bootcamp-secret-key-change-in-production")

## 🚀 Déploiement Vercel

### Configuration des variables d'environnement

1. **Aller sur Vercel Dashboard**
   - https://vercel.com/dashboard
   - Sélectionner le projet `v0-big-five-bootcamp-platform`

2. **Settings → Environment Variables**

Ajouter toutes ces variables :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jyycgendzegiazltvarx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eWNnZW5kemVnaWF6bHR2YXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjgyMTIsImV4cCI6MjA4NjIwNDIxMn0.BgRDYNTeWi9IYD581IdXVtza3RsF_UHPT2fWyrmV0kk
SUPABASE_SERVICE_ROLE_KEY=sb_secret_skP7cY1zH_YOoE3VZq76Iw_amo0wfO3

# Database (voir SUPABASE_PASSWORD_GUIDE.md pour récupérer le mot de passe)
DATABASE_URL=postgresql://postgres.jyycgendzegiazltvarx:[VOTRE-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# NextAuth
NEXTAUTH_URL=https://v0-big-five-bootcamp-platform.vercel.app
NEXTAUTH_SECRET=GENERER-UN-NOUVEAU-SECRET-SECURISE

# Stripe (si utilisé)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

3. **Générer un nouveau NEXTAUTH_SECRET**

```bash
# Dans le terminal
openssl rand -base64 32
```

Copier le résultat et l'utiliser comme `NEXTAUTH_SECRET`

4. **Redéployer**
   - Cliquer sur **Deployments**
   - Cliquer sur les 3 points (...) du dernier déploiement
   - Cliquer sur **Redeploy**

### Vérification du déploiement

1. **Tester l'API**
   ```bash
   curl https://v0-big-five-bootcamp-platform.vercel.app/api/test-supabase
   ```

2. **Tester l'authentification**
   - Aller sur https://v0-big-five-bootcamp-platform.vercel.app/auth
   - Créer un compte ou se connecter

3. **Vérifier les logs Vercel**
   - Dans le dashboard Vercel → **Logs**
   - Vérifier qu'il n'y a pas d'erreurs

## 🔧 Migration des autres fonctionnalités

### À faire ensuite :

1. **Users Management** (admin/users)
   - Créer API routes `/api/users`
   - Mettre à jour AdminContext.addUser(), updateUser(), deleteUser()
   - Utiliser Supabase au lieu de state local

2. **Contents** (admin/content)
   - Créer table `contents` dans Supabase
   - Créer API routes `/api/contents`
   - Migrer AdminContext

3. **Bootcamps & Sessions** (déjà dans le schéma)
   - Créer les pages frontend
   - Utiliser les exemples dans `lib/supabase-examples.ts`

## 🆘 Troubleshooting

### Erreur "relation does not exist"
➡️ Le schéma n'est pas exécuté. Aller dans SQL Editor et exécuter `supabase-schema.sql`

### Erreur d'authentification "Invalid login credentials"
➡️ Vérifier que l'email est confirmé dans **Authentication** → **Users**

### Les campagnes ne s'affichent pas
➡️ Vérifier les RLS policies. Tester avec `supabaseAdmin` au lieu de `supabase`

### Erreur 403 Forbidden
➡️ Problème de RLS. Vérifier que l'utilisateur est authentifié et a les bonnes permissions

## 📚 Ressources

- **Guide complet Supabase** : `SUPABASE_README.md`
- **Exemples de code** : `lib/supabase-examples.ts`
- **Hook d'authentification** : `hooks/use-supabase-auth.ts`
- **Documentation Supabase** : https://supabase.com/docs

## ✨ Avantages de la migration

1. **Persistance des données** - Plus de localStorage, données stockées en base
2. **Multi-utilisateurs** - Chaque user a ses propres données
3. **Authentification sécurisée** - JWT tokens, refresh tokens, email verification
4. **Row Level Security** - Sécurité au niveau de la base de données
5. **Temps réel** (optionnel) - Possibilité de voir les mises à jour en temps réel
6. **Scalabilité** - Hébergé par Supabase, pas de limite de stockage
7. **API prête** - Routes API déjà créées et sécurisées
8. **Backup automatique** - Supabase gère les backups

---

**Date de migration** : 9 février 2026  
**Status** : En cours - À compléter avec l'exécution du schéma SQL
