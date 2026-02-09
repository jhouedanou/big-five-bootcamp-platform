# 🚀 Déploiement sur Vercel - Configuration Supabase

## 📍 URLs du projet

- **Production** : https://v0-big-five-bootcamp-platform.vercel.app
- **Développement** : http://localhost:3000
- **Supabase Dashboard** : https://supabase.com/dashboard/project/jyycgendzegiazltvarx

## ⚙️ Configuration requise sur Vercel

### 1. Variables d'environnement à ajouter

Dans **Vercel Dashboard** → **Settings** → **Environment Variables**, ajouter :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jyycgendzegiazltvarx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eWNnZW5kemVnaWF6bHR2YXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjgyMTIsImV4cCI6MjA4NjIwNDIxMn0.BgRDYNTeWi9IYD581IdXVtza3RsF_UHPT2fWyrmV0kk
SUPABASE_SERVICE_ROLE_KEY=sb_secret_skP7cY1zH_YOoE3VZq76Iw_amo0wfO3

# NextAuth
NEXTAUTH_SECRET=votre-secret-securise-pour-production
NEXTAUTH_URL=https://v0-big-five-bootcamp-platform.vercel.app

# Database (optionnel si vous utilisez Prisma)
DATABASE_URL=postgresql://postgres.jyycgendzegiazltvarx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

⚠️ **Important** : Pour `NEXTAUTH_SECRET`, générer une nouvelle clé sécurisée :
```bash
openssl rand -base64 32
```

### 2. Configuration Supabase Auth pour Vercel

Dans **Supabase Dashboard** → **Authentication** → **URL Configuration** :

#### Site URL
```
https://v0-big-five-bootcamp-platform.vercel.app
```

#### Redirect URLs (ajouter les deux)
```
https://v0-big-five-bootcamp-platform.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

#### Allowed Redirect URLs (pour logout)
```
https://v0-big-five-bootcamp-platform.vercel.app
http://localhost:3000
```

### 3. Exécuter le schéma SQL (si pas encore fait)

1. Aller sur https://supabase.com/dashboard/project/jyycgendzegiazltvarx
2. Cliquer sur **SQL Editor**
3. Copier le contenu de `supabase-schema.sql`
4. Exécuter le script

Cela créera :
- ✅ Tables : `users`, `campaigns`, `bootcamps`, `sessions`, `registrations`
- ✅ RLS Policies
- ✅ Triggers automatiques
- ✅ Données de démonstration (1 bootcamp + 2 sessions)

## 📋 Checklist de déploiement

### Avant de déployer

- [ ] Variables d'environnement ajoutées sur Vercel
- [ ] `NEXTAUTH_SECRET` généré et ajouté
- [ ] `NEXTAUTH_URL` pointant vers Vercel
- [ ] Schéma SQL exécuté dans Supabase
- [ ] URLs de redirection configurées dans Supabase Auth

### Après le déploiement

- [ ] Tester l'API : `https://v0-big-five-bootcamp-platform.vercel.app/api/test-supabase`
- [ ] Tester l'authentification : `/auth`
- [ ] Créer le premier admin
- [ ] Tester la création de campagnes

## 🔐 Créer le premier utilisateur admin (Production)

### Option 1 : Via l'interface web

1. Aller sur https://v0-big-five-bootcamp-platform.vercel.app/auth
2. Créer un compte avec votre email professionnel
3. Vérifier l'email de confirmation Supabase
4. Dans Supabase Dashboard → **Table Editor** → **users**
5. Trouver votre utilisateur et modifier `role` de `user` à `admin`
6. Recharger la page admin du site

### Option 2 : Via SQL (recommandé pour l'admin principal)

Dans **Supabase SQL Editor** :

```sql
-- 1. Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@bigfive.com',
  crypt('VotreMotDePasseSecurise123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin Big Five"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- 2. Noter l'ID retourné, puis créer le profil
-- Remplacer 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' par l'ID retourné ci-dessus
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  'admin@bigfive.com',
  'Admin Big Five',
  'admin',
  'Premium',
  'active'
);
```

### Option 3 : Via la CLI Supabase (pour développeurs)

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref jyycgendzegiazltvarx

# Créer l'admin via SQL
supabase db execute --file create-admin.sql
```

## 🧪 Tests en production

### 1. Tester la connexion Supabase
```
GET https://v0-big-five-bootcamp-platform.vercel.app/api/test-supabase
```

Doit retourner :
```json
{
  "success": true,
  "message": "✅ Connexion Supabase réussie!",
  "stats": {
    "total_bootcamps": 1,
    "sample_bootcamps": [...]
  }
}
```

### 2. Tester l'authentification

1. Aller sur : https://v0-big-five-bootcamp-platform.vercel.app/auth
2. Créer un compte ou se connecter
3. Vérifier la redirection vers `/dashboard`

### 3. Tester les campagnes (admin)

1. Se connecter en tant qu'admin
2. Aller sur : https://v0-big-five-bootcamp-platform.vercel.app/admin/campaigns
3. Créer une nouvelle campagne
4. Vérifier qu'elle apparaît dans la liste
5. Dans Supabase Table Editor, vérifier la présence dans la table `campaigns`

### 4. Tester les bootcamps

```
GET https://v0-big-five-bootcamp-platform.vercel.app/api/bootcamps
```

Doit retourner la liste des bootcamps (au moins 1 : Social Media Management).

## 🚨 Problèmes courants

### Erreur "Invalid API key"
➡️ Vérifier que `NEXT_PUBLIC_SUPABASE_ANON_KEY` est bien configurée dans Vercel

### Erreur d'authentification "redirect_uri_mismatch"
➡️ Ajouter l'URL Vercel dans les Redirect URLs de Supabase Auth

### Erreur 500 sur les API routes
➡️ Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est configurée dans Vercel

### Les campagnes ne se chargent pas
➡️ Vérifier que le schéma SQL a été exécuté (vérifier les tables dans Supabase)

### Erreur "relation does not exist"
➡️ Le schéma SQL n'est pas exécuté. Aller dans SQL Editor et exécuter `supabase-schema.sql`

## 📊 Monitoring

### Logs Vercel
https://vercel.com/jhouedanou/v0-big-five-bootcamp-platform/logs

### Logs Supabase
https://supabase.com/dashboard/project/jyycgendzegiazltvarx/logs/explorer

### Analytics
- Vercel Analytics (intégré)
- Supabase Database Usage
- API Routes Performance

## 🔄 Workflow de développement

### Développement local
```bash
# 1. Pull les dernières modifications
git pull origin main

# 2. Installer les dépendances
pnpm install

# 3. Configurer .env (déjà fait)
# Variables pointent vers Supabase

# 4. Lancer le serveur
pnpm dev

# 5. Ouvrir http://localhost:3000
```

### Déployer sur Vercel
```bash
# Option 1 : Via Git (automatique)
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
# Vercel déploie automatiquement

# Option 2 : Via CLI Vercel
vercel --prod
```

## 📚 Prochaines étapes

### Phase 1 : Configuration de base ✅
- [x] Schéma SQL créé
- [x] API Routes campagnes créées
- [x] Authentification Supabase intégrée
- [x] AdminContext migré
- [ ] **CRITIQUE** : Exécuter le schéma SQL dans Supabase
- [ ] Configurer Auth URLs dans Supabase
- [ ] Créer premier admin
- [ ] Tester en production

### Phase 2 : Pages Bootcamp
- [ ] Homepage avec bootcamps en vedette
- [ ] Page catalogue des bootcamps
- [ ] Page détail bootcamp (sales page)
- [ ] Page sélection de session
- [ ] Page checkout/inscription
- [ ] Page confirmation

### Phase 3 : Admin avancé
- [ ] Gestion des utilisateurs (table users)
- [ ] Gestion des bootcamps (CRUD)
- [ ] Gestion des sessions (CRUD)
- [ ] Dashboard analytics
- [ ] Export de données

### Phase 4 : Paiement & Email
- [ ] Intégration Stripe
- [ ] Emails de confirmation (Supabase + Resend)
- [ ] Emails de rappel avant session
- [ ] Factures automatiques

## 🔗 Liens utiles

- **Site production** : https://v0-big-five-bootcamp-platform.vercel.app
- **Dashboard Vercel** : https://vercel.com/jhouedanou/v0-big-five-bootcamp-platform
- **Dashboard Supabase** : https://supabase.com/dashboard/project/jyycgendzegiazltvarx
- **Repo GitHub** : https://github.com/jhouedanou/big-five-bootcamp-platform
- **Documentation** :
  - `MIGRATION_SUPABASE.md` - Guide de migration
  - `SUPABASE_README.md` - Guide Supabase
  - `NEXT_STEPS.md` - Prochaines étapes

---

**Dernière mise à jour** : 9 février 2026  
**Status** : En cours de déploiement  
**Action requise** : Exécuter le schéma SQL dans Supabase
