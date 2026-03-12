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

### Étape 3 : Ajouter les variables Chariow
1. Allez sur https://chariow.dev/dashboard
2. Connectez-vous à votre compte
3. Récupérez votre clé API et l'ID de votre produit :

```env
# Chariow Configuration
CHARIOW_API_KEY=sk_vlo9hhl7_433626919d901182ac13b5ab9a6d448e
CHARIOW_PRODUCT_ID=creative-library
```

### Étape 4 : Ajouter l'URL de l'application

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📋 Fichier .env.local complet

```env
# ============================================================================
# SUPABASE - Base de données et authentification
# ============================================================================
# Allez sur https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# CHARIOW - Paiement & Licences
# ============================================================================
# Allez sur https://chariow.dev/dashboard
CHARIOW_API_KEY=sk_vlo9hhl7_433626919d901182ac13b5ab9a6d448e
CHARIOW_PRODUCT_ID=creative-library

# Optionnel - Pour les paiements de bootcamps
# CHARIOW_BOOTCAMP_PRODUCT_ID=votre_product_id_bootcamp

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
pnpm dev
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

### Chariow
1. Dashboard : https://chariow.dev/dashboard
2. Créez un produit de type **Licence** (prix : 25 000 XOF)
3. Copiez :
   - **API Key** → `CHARIOW_API_KEY`
   - **Product ID** → `CHARIOW_PRODUCT_ID`
4. Configurez les Pulses (webhooks) avec l'URL : `{NEXT_PUBLIC_APP_URL}/api/payment/webhook`

## 🎯 Prochaines étapes

Après avoir configuré `.env.local` :

1. ✅ Redémarrer le serveur : `pnpm dev`
2. ✅ Tester le paiement sur http://localhost:3000/subscribe
3. ✅ Vérifier les webhooks dans les logs

---

Voir aussi : [CHARIOW_SETUP.md](./CHARIOW_SETUP.md) pour le guide d'intégration complet.
