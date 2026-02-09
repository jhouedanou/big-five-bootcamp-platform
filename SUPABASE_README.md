# Configuration Supabase - Big Five Bootcamp Platform

## 📋 Informations du projet

- **Project ID**: `jyycgendzegiazltvarx`
- **Project URL**: `https://jyycgendzegiazltvarx.supabase.co`
- **Region**: EU Central (Francfort)

## 🚀 Instructions de configuration

### 1. Créer la base de données

1. Connectez-vous à [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet `jyycgendzegiazltvarx`
3. Allez dans **SQL Editor**
4. Copiez le contenu du fichier `supabase-schema.sql`
5. Exécutez le script SQL

Cela va créer :
- ✅ Tables `bootcamps`, `sessions`, `registrations`
- ✅ Index pour les performances
- ✅ Triggers pour `updated_at` et `available_spots`
- ✅ Row Level Security (RLS) policies
- ✅ Données de démonstration (1 bootcamp avec 2 sessions)

### 2. Vérifier les clés API

Les clés API sont déjà configurées dans le fichier `.env` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jyycgendzegiazltvarx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... (votre clé anon)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_skP7cY1zH_YOoE3VZq76Iw_amo0wfO3
```

⚠️ **Important** : La clé `anon key` dans le `.env` est un placeholder. Pour obtenir la vraie :

1. Allez dans **Settings** → **API**
2. Copiez la clé **anon/public** 
3. Remplacez dans `.env`

### 3. Configurer l'authentification (optionnel)

Si vous voulez utiliser Supabase Auth au lieu de NextAuth :

1. Allez dans **Authentication** → **Providers**
2. Activez **Email** provider
3. Configurez les templates d'emails dans **Email Templates**

### 4. Configuration du Storage (pour les images)

Pour uploader les images des trainers et bootcamps :

1. Allez dans **Storage**
2. Créez un bucket `bootcamp-images`
3. Configurez les policies :

```sql
-- Tout le monde peut lire
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'bootcamp-images');

-- Seuls les admins peuvent uploader
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'bootcamp-images' AND auth.jwt() ->> 'role' = 'admin');
```

## 📊 Structure de la base de données

### Table `bootcamps`
Stocke les thématiques de bootcamps (produits).

**Champs principaux** :
- `slug` : identifiant URL unique (ex: `social-media-management-avance`)
- `title`, `tagline`, `description` : contenu marketing
- `level` : 'Intermédiaire' ou 'Avancé'
- `price` : prix en FCFA
- `program` : JSON avec le programme détaillé
- `trainer` : JSON avec infos du formateur
- `faq` : JSON avec questions/réponses

### Table `sessions`
Dates et lieux spécifiques pour chaque bootcamp.

**Champs principaux** :
- `bootcamp_id` : référence au bootcamp
- `start_date` / `end_date` : dates de la session
- `city`, `location` : lieu
- `format` : 'Présentiel' ou 'Hybride'
- `max_capacity` / `available_spots` : gestion des places
- `status` : 'Ouvert', 'Complet', 'Annulé'

### Table `registrations`
Inscriptions des participants.

**Champs principaux** :
- `session_id` : référence à la session
- `user_email`, `first_name`, `last_name`, `phone` : infos participant
- `company`, `job_title` : infos professionnelles
- `payment_status` : 'Pending', 'Paid', 'Failed'
- `amount` : montant payé

## 🔐 Row Level Security (RLS)

Les policies configurées :

### Bootcamps & Sessions
- **SELECT** : Public (tout le monde peut voir)
- **INSERT/UPDATE/DELETE** : Admin seulement (via service role key)

### Registrations
- **INSERT** : Public (n'importe qui peut s'inscrire)
- **SELECT** : 
  - User peut voir ses propres inscriptions
  - Admin peut tout voir

## 🛠️ Utilisation dans le code

### Client-side (composants React)

```typescript
import { supabase } from '@/lib/supabase'

// Récupérer tous les bootcamps
const { data: bootcamps } = await supabase
  .from('bootcamps')
  .select('*')
  .order('created_at', { ascending: false })

// Récupérer un bootcamp par slug
const { data: bootcamp } = await supabase
  .from('bootcamps')
  .select('*, sessions(*)')
  .eq('slug', 'social-media-management-avance')
  .single()

// Récupérer les sessions d'un bootcamp
const { data: sessions } = await supabase
  .from('sessions')
  .select('*')
  .eq('bootcamp_id', bootcampId)
  .eq('status', 'Ouvert')
  .order('start_date', { ascending: true })
```

### Server-side (API routes)

```typescript
import { supabaseAdmin } from '@/lib/supabase'

// Créer une inscription (avec service role key)
const { data, error } = await supabaseAdmin
  .from('registrations')
  .insert({
    session_id: sessionId,
    user_email: email,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    payment_status: 'Pending',
    payment_method: 'Card',
    amount: 450000
  })
  .select()
  .single()
```

## 📈 Monitoring

### Voir les inscriptions en temps réel

Dans le Dashboard Supabase :
1. **Table Editor** → `registrations`
2. Filtrer par `payment_status = 'Paid'` pour voir les paiements confirmés

### Analytics

1. **Reports** → voir l'usage de la base de données
2. **Logs** → voir les requêtes SQL en temps réel
3. **API** → voir les appels API

## 🔄 Backup & Migration

### Export des données

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link au projet
supabase link --project-ref jyycgendzegiazltvarx

# Dump la base de données
supabase db dump -f backup.sql
```

### Import de données

Utilisez le SQL Editor pour importer des données en masse :

```sql
-- Exemple : importer plusieurs bootcamps
INSERT INTO bootcamps (slug, title, ...) VALUES
  ('bootcamp-1', 'Titre 1', ...),
  ('bootcamp-2', 'Titre 2', ...);
```

## 🐛 Troubleshooting

### Erreur "relation does not exist"
➡️ Le schéma n'est pas créé. Exécutez `supabase-schema.sql`

### Erreur "permission denied"
➡️ Vérifiez les RLS policies et que vous utilisez la bonne clé API

### Les triggers ne fonctionnent pas
➡️ Vérifiez que les fonctions sont créées avant les triggers

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
