# 📊 Configuration Supabase - Big Five Creative Library Platform

## 🎯 Résumé de la configuration

Supabase a été configuré avec succès pour gérer toutes les données de la plateforme Creative Library :
- ✅ Client Supabase installé et configuré
- ✅ Schéma de base de données créé (3 tables)
- ✅ Variables d'environnement ajoutées
- ✅ Exemples d'API fournis
- ✅ Documentation complète

## 📁 Fichiers créés

### Configuration
- `lib/supabase.ts` - Client Supabase et types TypeScript
- `.env` - Variables d'environnement (avec clés API)

### Schéma & données
- `supabase-schema.sql` - Script SQL complet à exécuter dans Supabase

### Documentation
- `SUPABASE_README.md` - Guide complet d'utilisation
- `NEXT_STEPS.md` - Étapes suivantes détaillées
- `lib/supabase-examples.ts` - Exemples de code pour les API routes

### Test
- `app/api/test-supabase/route.ts` - Route pour tester la connexion

## 🔑 Informations du projet Supabase

```
Project ID: jyycgendzegiazltvarx
Project URL: https://jyycgendzegiazltvarx.supabase.co
Service Role Key: sb_secret_skP7cY1zH_YOoE3VZq76Iw_amo0wfO3
```

⚠️ **Action requise** : Récupérer la clé `anon/public` depuis le Dashboard Supabase

## 📊 Structure de la base de données

### Table `Creative Librarys`
Stocke les thématiques de formation (les "produits")

**Champs clés** :
- `slug` : URL-friendly identifier (ex: `social-media-management-avance`)
- `title`, `tagline`, `description` : Contenu marketing
- `level` : 'Intermédiaire' ou 'Avancé'
- `price` : Prix en FCFA (ex: 450000)
- `program` : JSON détaillé du programme jour par jour
- `trainer` : JSON avec infos formateur
- `faq` : JSON questions/réponses

### Table `sessions`
Dates et lieux spécifiques pour chaque Creative Library

**Champs clés** :
- `Creative Library_id` : Référence au Creative Library
- `start_date`, `end_date` : Dates de la session
- `city`, `location` : Lieu (ex: "Abidjan", "Big Five Campus")
- `format` : 'Présentiel' ou 'Hybride'
- `max_capacity`, `available_spots` : Gestion des places
- `status` : 'Ouvert', 'Complet', 'Annulé'

### Table `registrations`
Inscriptions des participants

**Champs clés** :
- `session_id` : Référence à la session
- `user_email`, `first_name`, `last_name`, `phone` : Infos participant
- `company`, `job_title` : Infos professionnelles
- `payment_status` : 'Pending', 'Paid', 'Failed'
- `payment_method` : 'Card', 'Transfer', 'Quote'
- `amount` : Montant en FCFA

## 🚀 Fonctionnalités automatiques

### Triggers SQL configurés

1. **Auto-update `updated_at`** : Mise à jour automatique du timestamp
2. **Auto-update `available_spots`** : Décrémente automatiquement quand inscription créée
3. **Auto-update `status`** : Passe à "Complet" si `available_spots = 0`

### Row Level Security (RLS)

- **Creative Librarys & Sessions** : Lecture publique, écriture admin seulement
- **Registrations** : Création publique, lecture limitée (own data + admin)

## 🧪 Tester la configuration

### 1. Exécuter le schéma SQL

```bash
1. Ouvrir https://supabase.com/dashboard
2. Sélectionner le projet jyycgendzegiazltvarx
3. Aller dans SQL Editor
4. Copier/coller le contenu de supabase-schema.sql
5. Cliquer sur RUN
```

### 2. Vérifier dans Table Editor

Vous devriez voir :
- ✅ 1 Creative Library : "Social Media Management Avancé"
- ✅ 2 sessions : Mars 2026 et Avril 2026

### 3. Tester l'API

```bash
# Visiter dans le navigateur
http://localhost:3000/api/test-supabase

# Devrait retourner
{
  "success": true,
  "message": "✅ Connexion Supabase réussie!",
  "stats": {
    "total_Creative Librarys": 1,
    "sample_Creative Librarys": [...]
  }
}
```

## 💻 Exemples d'utilisation

### Récupérer tous les Creative Librarys

```typescript
import { supabase } from '@/lib/supabase'

const { data: Creative Librarys } = await supabase
  .from('Creative Librarys')
  .select('*')
  .order('created_at', { ascending: false })
```

### Récupérer un Creative Library avec ses sessions

```typescript
const { data: Creative Library } = await supabase
  .from('Creative Librarys')
  .select(`
    *,
    sessions (*)
  `)
  .eq('slug', 'social-media-management-avance')
  .single()
```

### Créer une inscription

```typescript
import { supabaseAdmin } from '@/lib/supabase'

const { data, error } = await supabaseAdmin
  .from('registrations')
  .insert({
    session_id: 'xxx',
    user_email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+225 XX XX XX XX',
    payment_status: 'Pending',
    payment_method: 'Card',
    amount: 450000
  })
```

Plus d'exemples dans `lib/supabase-examples.ts` 📚

## 🎨 Prochaines étapes

1. ✅ **Exécuter le schéma SQL** dans Supabase Dashboard
2. ✅ **Mettre à jour la clé anon** dans `.env`
3. ✅ **Tester la connexion** via `/api/test-supabase`
4. 🔜 **Créer les pages** :
   - Homepage avec Creative Librarys en vedette
   - Catalogue des Creative Librarys
   - Page de détail Creative Library
   - Sélection de session
   - Checkout
   - Confirmation

## 📚 Documentation complète

- **Guide complet** : `SUPABASE_README.md`
- **Étapes détaillées** : `NEXT_STEPS.md`
- **Exemples de code** : `lib/supabase-examples.ts`

## 🆘 Besoin d'aide ?

### Erreur "relation does not exist"
➡️ Le schéma SQL n'a pas été exécuté. Suivre les étapes dans `NEXT_STEPS.md`

### Erreur "Invalid API key"
➡️ Mettre à jour `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env` avec la vraie clé

### Les triggers ne fonctionnent pas
➡️ Vérifier que tout le script SQL a été exécuté (fonctions + triggers)

---

**Créé le** : 9 février 2026  
**Projet** : Big Five Creative Library Platform  
**Supabase Project** : jyycgendzegiazltvarx
