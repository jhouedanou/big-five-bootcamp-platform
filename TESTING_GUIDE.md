# Guide de test - Abonnement 150 XOF avec PayTech

## 🚀 Démarrage rapide

### 1. Configuration de la base de données

Exécutez le script de migration pour ajouter les colonnes d'abonnement :

```bash
# Via psql
psql -h your-host -U your-user -d your-database -f scripts/add-subscription-columns.sql

# Ou via Supabase SQL Editor
# Copiez-collez le contenu de scripts/add-subscription-columns.sql
```

### 2. Variables d'environnement

Vérifiez que votre fichier `.env.local` contient :

```env
# PayTech Configuration
PAYTECH_API_KEY=your_api_key_here
PAYTECH_API_SECRET=your_api_secret_here
PAYTECH_ENV=test
NEXTAUTH_URL=http://localhost:3000

# Supabase (déjà configuré normalement)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Démarrer l'application

```bash
pnpm dev
```

L'application sera accessible sur http://localhost:3000

## 🧪 Scénarios de test

### Test 1 : Flux complet d'abonnement

1. **Accédez à la page d'abonnement**
   ```
   http://localhost:3000/subscribe
   ```

2. **Si non connecté**
   - Vous serez redirigé vers `/login?redirect=/subscribe`
   - Connectez-vous ou créez un compte
   - Vous serez redirigé automatiquement vers `/subscribe`

3. **Étape 1 : Choisir le moyen de paiement**
   - Mobile Money (Orange, MTN, Moov, Wave)
   - Carte Bancaire
   - Cliquez sur "Continuer"

4. **Étape 2 : Remplir les informations**
   - Pour Mobile Money : Sélectionnez l'opérateur et entrez votre numéro
   - Pour Carte : Entrez les infos de carte (test)
   - Acceptez les CGV
   - Cliquez sur "Valider le paiement"

5. **Redirection vers PayTech**
   - Vous serez redirigé vers la page de paiement PayTech
   - En mode test, utilisez les numéros de test fournis par PayTech

6. **Confirmation**
   - Après paiement, vous serez redirigé vers `/payment/success`
   - Le webhook IPN sera appelé par PayTech
   - Votre abonnement sera automatiquement activé

### Test 2 : Vérifier l'abonnement dans la base de données

```sql
-- Vérifier l'abonnement d'un utilisateur
SELECT 
  id,
  email,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  subscription_end_date - NOW() as days_remaining
FROM users
WHERE email = 'votre.email@example.com';
```

### Test 3 : Vérifier le paiement

```sql
-- Vérifier les paiements
SELECT 
  id,
  ref_command,
  user_email,
  amount,
  status,
  payment_method,
  metadata->>'type' as payment_type,
  created_at
FROM payments
WHERE user_email = 'votre.email@example.com'
ORDER BY created_at DESC
LIMIT 5;
```

## 🔍 Points de vérification

### ✅ Avant le paiement

- [ ] Page `/subscribe` accessible
- [ ] Redirection vers login si non connecté
- [ ] Formulaire s'affiche correctement
- [ ] Prix affiché : **150 XOF**
- [ ] Durée affichée : **1 mois**

### ✅ Pendant le paiement

- [ ] Appel API `/api/payment/subscribe` réussit
- [ ] Paiement créé dans la table `payments` avec status `pending`
- [ ] Redirection vers PayTech
- [ ] URL contient le token PayTech

### ✅ Après le paiement (via IPN)

- [ ] Webhook `/api/payment/ipn` reçoit la notification
- [ ] Statut du paiement mis à jour : `completed`
- [ ] Champs utilisateur mis à jour :
  - `subscription_status` = 'active'
  - `subscription_start_date` = date du jour
  - `subscription_end_date` = date du jour + 30 jours
- [ ] Redirection vers `/payment/success`
- [ ] Page de succès affiche les bonnes informations

## 🐛 Debug

### Voir les logs du serveur

```bash
# Terminal où tourne pnpm dev
# Les logs API apparaîtront ici
```

### Logs importants à surveiller

```
📥 PayTech IPN received: { type_event: 'sale_complete', ... }
✅ Payment processed successfully: SUB-XXXXX
✅ Subscription activated for user: user-uuid
```

### Vérifier les webhooks en production

Pour tester les webhooks IPN en local, utilisez ngrok :

```bash
# Installer ngrok
npm install -g ngrok

# Exposer votre serveur local
ngrok http 3000

# Utilisez l'URL https://xxxx.ngrok.io dans vos variables d'environnement
NEXTAUTH_URL=https://xxxx.ngrok.io
```

## 🔐 Données de test PayTech

En mode `PAYTECH_ENV=test`, PayTech fournit des données de test. Consultez leur documentation pour :
- Numéros de téléphone de test
- Cartes bancaires de test
- Scénarios de test (succès, échec, timeout, etc.)

## 📊 Dashboard de suivi

### Statistiques d'abonnements

```sql
-- Nombre d'abonnements actifs
SELECT COUNT(*) as active_subscriptions
FROM users
WHERE subscription_status = 'active'
  AND subscription_end_date > NOW();

-- Revenus mensuels (abonnements)
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(*) * 150 as total_revenue_xof
FROM payments
WHERE status = 'completed'
  AND metadata->>'type' = 'subscription'
  AND created_at >= NOW() - INTERVAL '30 days';

-- Abonnements expirant bientôt (7 prochains jours)
SELECT 
  email,
  subscription_end_date,
  subscription_end_date - NOW() as days_remaining
FROM users
WHERE subscription_status = 'active'
  AND subscription_end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY subscription_end_date ASC;
```

## ⚠️ Problèmes courants

### Problème : IPN non reçu

**Causes possibles :**
- URL IPN non accessible publiquement (localhost)
- Firewall bloque PayTech
- URL incorrecte dans les variables d'environnement

**Solution :**
- Utilisez ngrok pour tester en local
- Vérifiez les logs PayTech
- Testez l'endpoint manuellement : `POST /api/payment/ipn`

### Problème : Abonnement non activé

**Causes possibles :**
- IPN non reçu ou échoué
- Erreur dans le webhook
- Colonnes manquantes dans la table users

**Solution :**
- Vérifiez les logs serveur
- Exécutez la migration SQL
- Vérifiez que l'IPN signature est valide

### Problème : Redirection vers login infinie

**Causes possibles :**
- Session Supabase expirée
- Cookie bloqué
- Problème d'authentification

**Solution :**
- Effacez les cookies
- Vérifiez la configuration Supabase
- Reconnectez-vous

## 📞 Support

- **Documentation PayTech** : https://doc.intech.sn/doc_paytech.php
- **Support PayTech** : support@paytech.sn
- **Documentation Supabase** : https://supabase.com/docs

## ✅ Checklist avant déploiement en production

- [ ] Variables d'environnement en production configurées
- [ ] `PAYTECH_ENV=prod` en production
- [ ] Clés API PayTech en mode production
- [ ] URL IPN accessible publiquement
- [ ] Migration SQL exécutée sur la BDD de production
- [ ] Tests complets effectués en mode test
- [ ] Vérification que tous les paiements test fonctionnent
- [ ] Politique de sécurité (RLS) Supabase vérifiée
- [ ] Logs et monitoring configurés
- [ ] Plan de gestion des abonnements expirés (cron job)

---

**Bon courage pour les tests ! 🚀**
