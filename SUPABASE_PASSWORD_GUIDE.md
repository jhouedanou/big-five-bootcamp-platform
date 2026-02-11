# 🔑 Comment récupérer le mot de passe de la base de données Supabase

## Méthode 1 : Via le Dashboard Supabase (Recommandé)

1. **Aller sur le Dashboard**
   - Ouvrir https://supabase.com/dashboard
   - Sélectionner le projet `jyycgendzegiazltvarx`

2. **Accéder aux paramètres de la base de données**
   - Cliquer sur **Settings** (⚙️) dans la sidebar
   - Cliquer sur **Database**

3. **Récupérer le Connection String**
   - Scroller jusqu'à la section **Connection string**
   - Choisir le mode **Session** ou **Transaction**
   - Cliquer sur le bouton **Copy** à côté du connection string
   - Le format sera : `postgresql://postgres.jyycgendzegiazltvarx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`

4. **Extraire le mot de passe**
   - Le mot de passe se trouve entre `postgres.jyycgendzegiazltvarx:` et `@aws-0-eu-central-1`
   - Copier uniquement cette partie

5. **Mettre à jour le .env**
   - Ouvrir le fichier `.env`
   - Remplacer `[YOUR-PASSWORD]` par le vrai mot de passe
   - Sauvegarder

## Méthode 2 : Réinitialiser le mot de passe

Si vous ne trouvez pas le mot de passe original :

1. **Dans le Dashboard Supabase**
   - Settings → Database
   - Scroller jusqu'à **Database password**
   - Cliquer sur **Reset database password**
   - Choisir un nouveau mot de passe sécurisé
   - Copier le nouveau mot de passe

2. **Important** : Après réinitialisation
   - Toutes les connexions existantes seront interrompues
   - Vous devrez mettre à jour tous vos fichiers de configuration

## Méthode 3 : Via Supabase CLI (Avancé)

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link au projet
supabase link --project-ref jyycgendzegiazltvarx

# Récupérer les credentials
supabase status
```

## 📝 Format du DATABASE_URL

Une fois le mot de passe récupéré, votre `.env` devrait ressembler à :

```bash
DATABASE_URL="postgresql://postgres.jyycgendzegiazltvarx:VOTRE_MOT_DE_PASSE_ICI@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**Remplacez** `VOTRE_MOT_DE_PASSE_ICI` par le mot de passe réel.

## ⚠️ Sécurité

- **Ne jamais commit** le `.env` dans Git (déjà dans `.gitignore`)
- **Ne jamais partager** le mot de passe de la base de données
- **Utiliser des mots de passe forts** (minimum 16 caractères)
- Pour la production, utiliser les **Variables d'environnement Vercel**

## 🚀 Configuration Vercel (Production)

Pour le site déployé sur `v0-big-five-Creative Library-platform.vercel.app` :

1. **Aller sur Vercel Dashboard**
   - https://vercel.com/dashboard
   - Sélectionner le projet `v0-big-five-Creative Library-platform`

2. **Configurer les variables d'environnement**
   - Settings → Environment Variables
   - Ajouter chaque variable du `.env` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jyycgendzegiazltvarx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_skP7cY1zH_YOoE3VZq76Iw_amo0wfO3
DATABASE_URL=postgresql://postgres.jyycgendzegiazltvarx:MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
NEXTAUTH_URL=https://v0-big-five-Creative Library-platform.vercel.app
NEXTAUTH_SECRET=bf5-Creative Library-secret-key-change-in-production
```

3. **Redéployer**
   - Cliquer sur **Redeploy** pour que les variables prennent effet

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. **En local** :
   ```bash
   # Tester la connexion
   curl http://localhost:3000/api/test-supabase
   ```

2. **En production** :
   ```bash
   # Tester la connexion
   curl https://v0-big-five-Creative Library-platform.vercel.app/api/test-supabase
   ```

## 🆘 Problèmes courants

### Erreur "password authentication failed"
➡️ Le mot de passe est incorrect. Réinitialiser le mot de passe dans Supabase.

### Erreur "connection refused"
➡️ Vérifier que l'URL de connexion est correcte (region, port).

### Erreur "too many connections"
➡️ Utiliser le **Session pooler** (port 6543) au lieu du port direct (5432).

---

**Besoin d'aide ?** Consultez la [documentation Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
