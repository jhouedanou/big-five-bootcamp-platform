# 🧪 Guide de Test des Paiements PayTech

Ce guide explique comment tester les paiements avec PayTech en mode test vs production.

## 🔒 Mode Test vs Production

### Comment PayTech gère les environnements

PayTech utilise une variable `env` pour différencier le mode test du mode production :

| Mode | Variable | Comportement |
|------|----------|--------------|
| **Test** | `PAYTECH_ENV=test` | ✅ Simule les paiements, aucun débit réel |
| **Production** | `PAYTECH_ENV=prod` | ⚠️ **DÉBITE RÉELLEMENT** l'argent |

## ⚙️ Configuration actuelle

Vérifiez votre fichier `.env.local` :

```bash
# Mode TEST (recommandé pour le développement)
PAYTECH_ENV=test

# Clés API PayTech (même clés pour test et prod)
PAYTECH_API_KEY=votre_api_key
PAYTECH_API_SECRET=votre_api_secret
```

## 🧪 Comment tester les paiements

### 1. Vérifier que vous êtes en mode test

```bash
# Dans votre terminal, vérifiez la variable
echo $env:PAYTECH_ENV  # Windows PowerShell
# ou
echo $PAYTECH_ENV      # Linux/Mac
```

Le fichier `lib/paytech.ts` affiche la config au démarrage :
```
PayTech Config: { API_KEY: '✓ Configuré', ENV: 'test' }
```

### 2. Simuler un paiement en mode test

#### Option A : Via l'interface utilisateur

1. Allez sur `/subscribe` ou `/pricing`
2. Cliquez sur "S'abonner" ou choisir un plan
3. Vous serez redirigé vers PayTech en mode sandbox
4. **En mode test**, utilisez ces numéros de test :

| Méthode | Numéro de test | Résultat |
|---------|----------------|----------|
| Orange Money SN | 77 123 45 67 | ✅ Paiement réussi |
| Wave SN | 77 000 00 00 | ✅ Paiement réussi |
| Carte bancaire | 4242 4242 4242 4242 | ✅ Paiement réussi |

#### Option B : Via le script de test

```bash
# Exécuter le script de test
node scripts/test-paytech.js
```

### 3. Vérifier les webhooks (IPN)

Pour tester les notifications de paiement (IPN) :

```bash
# Utiliser ngrok pour exposer votre localhost
ngrok http 3000

# Ensuite configurer l'URL IPN dans PayTech :
# https://votre-id.ngrok.io/api/payment/ipn
```

## 🚨 ATTENTION : Avant de passer en production

### Checklist obligatoire

- [ ] ✅ Tous les tests passent en mode `test`
- [ ] ✅ Les webhooks IPN sont correctement configurés
- [ ] ✅ Les URLs de succès/annulation fonctionnent
- [ ] ✅ La base de données enregistre correctement les transactions
- [ ] ✅ Les emails de confirmation sont envoyés

### Passer en production

```bash
# ⚠️ NE FAITES CECI QU'EN PRODUCTION RÉELLE
PAYTECH_ENV=prod
```

## 📊 Déboguer les paiements

### Voir les logs de paiement

```sql
-- Dans Supabase SQL Editor
SELECT 
  ref_command,
  status,
  env,
  amount,
  payment_method,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 20;
```

### Vérifier une transaction spécifique

```bash
# Via l'API
curl http://localhost:3000/api/payment/status?ref=BOOTCAMP_xxxxx
```

### Simuler un webhook IPN

```bash
curl -X POST http://localhost:3000/api/payment/ipn \
  -H "Content-Type: application/json" \
  -d '{
    "type_event": "sale_complete",
    "ref_command": "BOOTCAMP_test_123",
    "item_price": 4500,
    "currency": "XOF",
    "payment_method": "Orange Money",
    "client_phone": "771234567",
    "env": "test"
  }'
```

## 🔐 Sécurité des clés API

### Ne JAMAIS faire :
- ❌ Commiter les clés API dans Git
- ❌ Partager les clés en clair
- ❌ Utiliser les mêmes clés en dev et prod

### Toujours :
- ✅ Utiliser `.env.local` (ignoré par Git)
- ✅ Utiliser les variables d'environnement Vercel
- ✅ Rotater les clés régulièrement

## 📱 Test sur mobile (important pour Mobile Money)

Les paiements Mobile Money doivent être testés sur un vrai téléphone :

1. Déployez sur Vercel (preview)
2. Ouvrez l'URL de preview sur votre téléphone
3. Testez le flux de paiement complet
4. Vérifiez que la redirection fonctionne

## ❓ FAQ

### Q: Comment savoir si un paiement est en mode test ?

R: Vérifiez la colonne `env` dans la table `payments`. Elle indique `test` ou `prod`.

### Q: Les paiements test sont-ils vraiment gratuits ?

R: Oui, en mode `env=test`, PayTech simule le paiement sans aucun débit réel.

### Q: Puis-je utiliser mon vrai numéro en mode test ?

R: Oui, mais aucun argent ne sera débité. Cependant, il est recommandé d'utiliser les numéros de test officiels.

### Q: Comment annuler un paiement test ?

R: Les paiements test n'ont pas besoin d'être annulés car aucun argent n'a été débité.

---

## 📞 Support PayTech

- **Documentation** : https://doc.intech.sn/doc_paytech.php
- **Email** : support@paytech.sn
- **Dashboard** : https://paytech.sn/dashboard
