# 🚀 Prochaines étapes - Configuration Supabase

## ✅ Ce qui est déjà fait

1. ✅ Installation de `@supabase/supabase-js`
2. ✅ Configuration du client Supabase dans `lib/supabase.ts`
3. ✅ Variables d'environnement ajoutées dans `.env`
4. ✅ Schéma SQL créé dans `supabase-schema.sql`
5. ✅ Documentation complète dans `SUPABASE_README.md`
6. ✅ Exemples d'API dans `lib/supabase-examples.ts`

## 🎯 À faire maintenant (dans l'ordre)

### Étape 1 : Configurer la base de données Supabase ⏱️ 5 minutes

1. **Ouvrir le Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner le projet `jyycgendzegiazltvarx`

2. **Exécuter le schéma SQL**
   - Cliquer sur **SQL Editor** dans la sidebar
   - Copier tout le contenu du fichier `supabase-schema.sql`
   - Coller dans l'éditeur SQL
   - Cliquer sur **RUN** (ou `Cmd/Ctrl + Enter`)
   - ✅ Vérifier le message "Schéma créé avec succès!"

3. **Vérifier les tables créées**
   - Aller dans **Table Editor**
   - Vous devriez voir 3 tables : `Creative Librarys`, `sessions`, `registrations`
   - Cliquer sur `Creative Librarys` → vous devriez voir 1 ligne (Social Media Management)
   - Cliquer sur `sessions` → vous devriez voir 2 lignes

### Étape 2 : Récupérer la vraie clé API ⏱️ 2 minutes

1. Dans Supabase Dashboard, aller dans **Settings** → **API**
2. Copier la clé **anon / public** (commence par `eyJhbGc...`)
3. Ouvrir le fichier `.env` local
4. Remplacer la valeur de `NEXT_PUBLIC_SUPABASE_ANON_KEY` par la vraie clé
5. Sauvegarder le fichier

⚠️ **Important** : Ne pas commit le `.env` dans Git (déjà dans `.gitignore`)

### Étape 3 : Obtenir le mot de passe de la base de données ⏱️ 2 minutes

Pour la `DATABASE_URL` (optionnel si vous gardez Prisma) :

1. Dans Supabase Dashboard → **Settings** → **Database**
2. Copier le **Connection string** en mode **Session pooler**
3. Remplacer `[YOUR-PASSWORD]` dans `.env` par le vrai mot de passe
4. Ou utiliser directement le connection string fourni

### Étape 4 : Tester la connexion ⏱️ 3 minutes

Créer un fichier de test `app/api/test-supabase/route.ts` :

```typescript
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Creative Librarys')
      .select('title')
      .limit(1)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Connexion Supabase OK!',
      Creative Library: data[0]?.title 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

Puis tester : http://localhost:3000/api/test-supabase

### Étape 5 : Ajouter plus de données (optionnel) ⏱️ 10 minutes

Créer plus de Creative Librarys pour le catalogue :

```sql
-- Dans le SQL Editor de Supabase

INSERT INTO Creative Librarys (
  slug,
  title,
  tagline,
  level,
  duration,
  price,
  target_audience,
  prerequisites,
  objectives,
  program,
  methodology,
  trainer,
  description
) VALUES 
(
  'marketing-digital-strategique',
  'Marketing Digital Stratégique',
  'Élaborez une stratégie marketing digital complète et performante',
  'Intermédiaire',
  '2 jours (14 heures)',
  400000,
  ARRAY['Responsables marketing', 'Chefs de projet digital', 'Entrepreneurs'],
  ARRAY['Connaissances de base en marketing', 'Compréhension du digital'],
  ARRAY['Créer une stratégie digitale alignée sur les objectifs', 'Maîtriser le marketing de contenu', 'Optimiser le ROI des campagnes'],
  '{"day1": {"title": "Jour 1", "modules": []}, "day2": {"title": "Jour 2", "modules": []}}'::jsonb,
  'Approche pratique avec 70% d''exercices',
  '{"name": "Marc Dupont", "title": "Expert Marketing Digital"}'::jsonb,
  'Formation intensive au marketing digital stratégique'
),
(
  'data-analytics-business',
  'Data Analytics pour le Business',
  'Transformez vos données en décisions stratégiques',
  'Avancé',
  '2 jours (14 heures)',
  500000,
  ARRAY['Data analysts', 'Business analysts', 'Managers'],
  ARRAY['Bases en Excel', 'Compréhension des statistiques'],
  ARRAY['Analyser et visualiser les données', 'Créer des dashboards pertinents', 'Piloter par la data'],
  '{"day1": {"title": "Jour 1", "modules": []}, "day2": {"title": "Jour 2", "modules": []}}'::jsonb,
  'Formation pratique avec des cas réels',
  '{"name": "Sophie Martin", "title": "Data Scientist"}'::jsonb,
  'Maîtrisez l''analyse de données pour le business'
);
```

## 📋 Checklist finale

Avant de passer à la création des pages :

- [ ] Schéma SQL exécuté avec succès
- [ ] Tables `Creative Librarys`, `sessions`, `registrations` visibles dans Table Editor
- [ ] Au moins 1 Creative Library et 2 sessions dans la base
- [ ] Clé API `NEXT_PUBLIC_SUPABASE_ANON_KEY` mise à jour dans `.env`
- [ ] Test de connexion réussi (`/api/test-supabase`)
- [ ] Serveur Next.js redémarré pour charger les nouvelles variables d'env

## 🎨 Prochaine étape : Créer les pages

Une fois Supabase configuré, nous pourrons créer :

1. **Homepage** (`/`) - Avec les Creative Librarys en vedette depuis Supabase
2. **Catalogue** (`/Creative Librarys`) - Liste tous les Creative Librarys
3. **Détail Creative Library** (`/Creative Librarys/[slug]`) - Page de vente
4. **Sélection session** (`/Creative Librarys/[slug]/sessions`) - Choix de la date
5. **Checkout** (`/checkout`) - Inscription et paiement
6. **Confirmation** (`/confirmation`) - Page de succès

## 💡 Aide

**Problème de connexion ?**
- Vérifier que les URLs et clés API sont correctes dans `.env`
- Vérifier que le serveur Next.js est redémarré
- Consulter `SUPABASE_README.md` section Troubleshooting

**Besoin d'aide pour les requêtes SQL ?**
- Voir `lib/supabase-examples.ts` pour des exemples complets
- Consulter la [documentation Supabase](https://supabase.com/docs)

**Questions sur les données ?**
- Structure détaillée dans `SUPABASE_README.md` section "Structure de la base de données"
- Exemples de données dans `supabase-schema.sql` à la fin du fichier
