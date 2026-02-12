# 🚨 RÉSOLUTION ERREUR 500 - RÉCAPITULATIF COMPLET

## 📋 Problème identifié

**Erreur** : `POST http://localhost:3000/api/payment/subscribe 500 (Internal Server Error)`

**Cause principale** : **Fichier `.env.local` manquant ou incomplet**

## ✅ SOLUTION EN 3 ÉTAPES

### 🔧 ÉTAPE 1 : Configuration des variables d'environnement (URGENT)

#### A. Créer le fichier .env.local

À la racine du projet, créez `.env.local` avec ce contenu minimal :

```bash
# 1. Créer le fichier
touch .env.local

# 2. Ou copier depuis le template
cp .env.example .env.local
```

#### B. Ajouter vos clés Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu **Settings** > **API**
4. Copiez dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### C. Ajouter vos clés PayTech

1. Allez sur https://paytech.sn/dashboard
2. Menu **API Keys**
3. Copiez dans `.env.local` :

```env
PAYTECH_API_KEY=votre_api_key
PAYTECH_API_SECRET=votre_api_secret
PAYTECH_ENV=test
```

#### D. Redémarrer le serveur

```bash
# Arrêter (Ctrl+C dans le terminal)
# Relancer
npm run dev
```

---

### 🗄️ ÉTAPE 2 : Créer la table payments dans Supabase

#### A. Ouvrir Supabase SQL Editor

1. https://supabase.com/dashboard
2. Votre projet **big-five-bootcamp-platform**
3. Menu **SQL Editor**
4. **New query**

#### B. Exécuter le script SQL

1. Ouvrez le fichier `scripts/fix-payments-table-v2.sql`
2. Copiez tout le contenu
3. Collez dans l'éditeur SQL
4. Cliquez **RUN** (ou Ctrl/Cmd + Enter)
5. Vérifiez le message de succès

---

### 🧪 ÉTAPE 3 : Vérifier que tout fonctionne

#### A. Diagnostic automatique

```bash
node scripts/diagnose-payment-error.js
```

**Résultat attendu** :
```
✅ Connexion Supabase OK
✅ Table payments existe
✅ Toutes les colonnes requises sont présentes
✅ Table users OK
✅ Variables PayTech configurées
✅ DIAGNOSTIC TERMINÉ
```

#### B. Test de paiement

1. Ouvrez http://localhost:3000/subscribe
2. Connectez-vous (ou créez un compte)
3. Sélectionnez un pays (CI, SN, ou BJ)
4. Entrez votre numéro
5. Sélectionnez un opérateur
6. Cliquez **Payer maintenant**

**Résultat attendu** : Redirection vers PayTech (pas d'erreur 500)

---

## 📁 Fichiers créés pour vous aider

| Fichier | Description |
|---------|-------------|
| `ENV_SETUP.md` | Guide détaillé de configuration des variables d'environnement |
| `FIX_ERROR_500.md` | Guide de résolution de l'erreur 500 |
| `.env.example` | Template du fichier .env.local |
| `scripts/fix-payments-table-v2.sql` | Migration SQL pour la table payments |
| `scripts/diagnose-payment-error.js` | Script de diagnostic automatique |
| `OPERATOR_SELECTION_UPDATE.md` | Documentation de la sélection d'opérateurs |

---

## 🔍 Si le problème persiste

### Vérifier les logs serveur

Dans le terminal où tourne `npm run dev`, vous devriez voir :

```
📨 Requête d'abonnement reçue: { userEmail: '...', paymentMethod: '...' }
💾 Création enregistrement paiement...
✅ Paiement créé: <uuid>
```

### Erreurs courantes

#### 1. "User not found" (404)
- Vous devez être connecté
- Vérifiez que votre email existe dans la table `users`

#### 2. "You already have an active subscription" (409)
- Votre abonnement est déjà actif
- Attendez qu'il expire ou testez avec un autre compte

#### 3. "Failed to create payment record" (500)
- La table `payments` n'existe pas ou est mal configurée
- Exécutez `scripts/fix-payments-table-v2.sql` dans Supabase

#### 4. Variables d'environnement non chargées
- Vérifiez que `.env.local` existe à la racine
- Redémarrez le serveur après modification
- Utilisez `npm run dev` (pas `next dev` directement)

---

## 🎯 Checklist finale

Avant de tester le paiement, vérifiez :

- [x] ✅ Fichier `.env.local` créé avec toutes les variables
- [x] ✅ Clés Supabase configurées et valides
- [x] ✅ Clés PayTech configurées (mode test)
- [x] ✅ Serveur redémarré : `npm run dev`
- [x] ✅ Script SQL `fix-payments-table-v2.sql` exécuté dans Supabase
- [x] ✅ Table `payments` créée avec toutes les colonnes
- [x] ✅ Diagnostic : `node scripts/diagnose-payment-error.js` → tout OK
- [x] ✅ Utilisateur connecté sur l'application
- [x] ✅ Test de paiement réussi (redirection PayTech)

---

## 📞 Commandes utiles

```bash
# Diagnostic complet
node scripts/diagnose-payment-error.js

# Redémarrer le serveur
npm run dev

# Vérifier les variables d'environnement
cat .env.local

# Tester la connexion Supabase
node -e "console.log(require('dotenv').config({path:'.env.local'}).parsed)"
```

---

## 🚀 Prochaines étapes après correction

1. ✅ Exécuter `scripts/add-notifications-system.sql` dans Supabase
   - Système de notifications d'abonnement
   - Rappels automatiques tous les 5 jours

2. ✅ Configurer le webhook IPN PayTech
   - URL : `https://votre-domaine.com/api/payment/ipn`
   - À configurer dans le dashboard PayTech en production

3. ✅ Tester le flux complet :
   - Inscription → Paiement → Activation abonnement → Notification

---

**Date de création** : 12 février 2026
**Statut** : ✅ Prêt à utiliser

---

## 💡 Besoin d'aide ?

1. **Problème avec Supabase** : Vérifiez les logs dans le dashboard Supabase
2. **Problème avec PayTech** : Testez avec `scripts/test-paytech.js`
3. **Problème général** : Exécutez `scripts/diagnose-payment-error.js`

Tous les outils de diagnostic sont prêts pour vous guider ! 🎉
