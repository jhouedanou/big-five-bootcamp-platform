# 🚨 Guide de résolution - Erreur 500 sur /api/payment/subscribe

## Problème
```
POST http://localhost:3000/api/payment/subscribe 500 (Internal Server Error)
```

## Cause probable
La table `payments` dans Supabase n'est pas correctement configurée ou comporte des contraintes de clé étrangère manquantes.

## ✅ Solution rapide (5 minutes)

### Étape 1 : Accéder à Supabase SQL Editor
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **big-five-bootcamp-platform**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Exécuter le script de correction
1. Créez une nouvelle requête
2. Copiez-collez le contenu du fichier `scripts/fix-payments-table-v2.sql`
3. Cliquez sur **RUN** (ou Ctrl/Cmd + Enter)
4. Vérifiez le message de succès

### Étape 3 : Vérifier la table
```sql
-- Vérifier que la table existe et a les bonnes colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Vérifier les contraintes
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'payments'::regclass;
```

### Étape 4 : Tester le paiement
1. Revenez sur http://localhost:3000/subscribe
2. Sélectionnez un pays (Côte d'Ivoire, Sénégal, ou Bénin)
3. Entrez votre numéro de téléphone
4. Sélectionnez un opérateur (ou laissez la détection automatique)
5. Cliquez sur **Payer maintenant**

## 🔍 Vérification des logs

### Logs serveur Next.js
Dans votre terminal où tourne `npm run dev`, vous devriez voir :
```
📨 Requête d'abonnement reçue: { userEmail: '...', paymentMethod: '...' }
💾 Création enregistrement paiement...
✅ Paiement créé: <uuid>
```

### En cas d'erreur persistante
Si vous voyez toujours l'erreur après avoir exécuté le script SQL, vérifiez :

1. **La table users existe-t-elle ?**
```sql
SELECT id, email, subscription_status FROM users LIMIT 1;
```

2. **Les variables d'environnement PayTech sont-elles configurées ?**
Vérifiez dans votre fichier `.env.local` :
```env
PAYTECH_API_KEY=votre_api_key
PAYTECH_API_SECRET=votre_api_secret
PAYTECH_ENV=test  # ou 'production'
```

3. **Testez la connexion Supabase**
```typescript
// Dans votre terminal node
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('users').select('count').then(console.log);
"
```

## 📋 Checklist complète

- [ ] Script SQL `fix-payments-table-v2.sql` exécuté avec succès
- [ ] Table `payments` créée avec toutes les colonnes
- [ ] Contrainte unique sur `ref_command`
- [ ] Index créés sur `user_email`, `status`, `ref_command`
- [ ] Variables d'environnement PayTech configurées
- [ ] Utilisateur connecté avec un email valide
- [ ] Test de paiement fonctionne sans erreur 500

## 🎯 Résultat attendu

Après avoir suivi ces étapes, vous devriez voir :
1. Pas d'erreur 500 dans la console
2. Redirection vers la page PayTech
3. Logs de succès dans le terminal serveur
4. Enregistrement créé dans la table `payments`

## 📞 Aide supplémentaire

Si le problème persiste :
1. Vérifiez les logs complets du serveur Next.js
2. Regardez les logs Supabase dans le dashboard (Logs & Monitoring)
3. Testez la requête API directement avec curl ou Postman :

```bash
curl -X POST http://localhost:3000/api/payment/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "votre@email.com",
    "paymentMethod": "Orange Money",
    "phoneNumber": "+225XXXXXXXXXX"
  }'
```

---

**Dernière mise à jour** : 12 février 2026
