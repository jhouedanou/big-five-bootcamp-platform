# 🔧 Configuration des variables d'environnement

## ❌ Problème identifié
Le fichier `.env.local` n'existe pas ou ne contient pas les variables nécessaires !

## ✅ Solution : Créer le fichier .env.local

### Étape 1 : Créer le fichier
À la racine du projet, créez un fichier nommé `.env.local`

### Étape 2 : Ajouter les variables Supabase
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez les valeurs suivantes :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
```

### Étape 3 : Ajouter les variables PayTech
1. Allez sur https://paytech.sn
2. Connectez-vous à votre compte
3. Allez dans **API Keys**
4. Copiez vos clés :

```env
# PayTech Configuration
PAYTECH_API_KEY=votre_api_key_ici
PAYTECH_API_SECRET=votre_api_secret_ici
PAYTECH_ENV=test
PAYTECH_SUCCESS_URL=http://localhost:3000/payment/success
PAYTECH_CANCEL_URL=http://localhost:3000/payment/cancel
PAYTECH_IPN_URL=http://localhost:3000/api/payment/ipn
```

### Étape 4 : Ajouter l'URL de l'application

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📋 Fichier .env.local complet

Créez ce fichier à la racine : `/Users/bfa/Documents/GitHub/big-five-bootcamp-platform/.env.local`

```env
# ============================================================================
# SUPABASE - Base de données et authentification
# ============================================================================
# Allez sur https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# PAYTECH - Paiement mobile money
# ============================================================================
# Allez sur https://paytech.sn/dashboard/api
PAYTECH_API_KEY=votre_api_key
PAYTECH_API_SECRET=votre_api_secret
PAYTECH_ENV=test

# URLs de callback PayTech
PAYTECH_SUCCESS_URL=http://localhost:3000/payment/success
PAYTECH_CANCEL_URL=http://localhost:3000/payment/cancel
PAYTECH_IPN_URL=http://localhost:3000/api/payment/ipn

# ============================================================================
# APPLICATION
# ============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================================================
# NEXTAUTH (Optionnel si vous utilisez NextAuth)
# ============================================================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_genere_avec_openssl
```

## 🔐 Générer NEXTAUTH_SECRET (optionnel)

Si vous utilisez NextAuth, générez un secret sécurisé :

```bash
openssl rand -base64 32
```

## ⚠️ Important : .gitignore

Vérifiez que `.env.local` est bien dans votre `.gitignore` :

```gitignore
# Fichiers d'environnement
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## ✅ Vérification

Après avoir créé le fichier `.env.local`, redémarrez le serveur de développement :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

## 🧪 Tester la configuration

```bash
# Diagnostic automatique
node scripts/diagnose-payment-error.js
```

Vous devriez voir :
```
✅ Connexion Supabase OK
✅ Table payments existe
✅ Variables PayTech configurées
✅ DIAGNOSTIC TERMINÉ
```

## 📞 Obtenir vos clés

### Supabase
1. Dashboard : https://supabase.com/dashboard
2. Sélectionnez votre projet **big-five-bootcamp-platform**
3. Settings > API
4. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Ne jamais exposer côté client !

### PayTech
1. Dashboard : https://paytech.sn/dashboard
2. Menu > API Keys / Clés API
3. Mode TEST pour le développement
4. Copiez :
   - **API Key** → `PAYTECH_API_KEY`
   - **API Secret** → `PAYTECH_API_SECRET`

## 🎯 Prochaines étapes

Après avoir configuré `.env.local` :

1. ✅ Redémarrer le serveur : `npm run dev`
2. ✅ Exécuter le diagnostic : `node scripts/diagnose-payment-error.js`
3. ✅ Exécuter les migrations SQL dans Supabase (voir `FIX_ERROR_500.md`)
4. ✅ Tester le paiement sur http://localhost:3000/subscribe

---

**Date** : 12 février 2026
