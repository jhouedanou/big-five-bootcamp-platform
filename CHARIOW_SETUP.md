# 🚀 Guide d'intégration Chariow — Big Five Creative Library

## Vue d'ensemble

Le système de paiement utilise **Chariow** (https://chariow.dev) pour gérer les abonnements Premium via checkout hébergé et licences.

### Flux de paiement

```
Utilisateur → /subscribe → POST /api/payment/subscribe
    → Chariow POST /v1/checkout (création checkout)
    → Redirection vers checkout_url Chariow
    → Utilisateur paie sur la page Chariow
    → Chariow envoie Pulse webhook → POST /api/payment/webhook
    → Activation de l'abonnement Premium
    → Redirection vers /payment/success
```

---

## ⚙️ Variables d'environnement

Ajoutez ces variables dans `.env.local` (dev) ou Vercel (production) :

```env
# Chariow API
CHARIOW_API_KEY=sk_vlo9hhl7_433626919d901182ac13b5ab9a6d448e
CHARIOW_PRODUCT_ID=creative-library

# Optionnel — pour les bootcamps
CHARIOW_BOOTCAMP_PRODUCT_ID=<product_id_bootcamp>

# URL publique de l'app (pour les redirections)
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
```

### Récupérer le Product ID

1. Connectez-vous sur https://chariow.dev/dashboard
2. Allez dans **Produits** → Créez un produit de type **Licence**
3. Définissez le prix : **25 000 XOF**
4. Copiez le `product_id` et mettez-le dans `CHARIOW_PRODUCT_ID`

---

## 🔗 Configuration des Pulses (Webhooks)

### Dans le Dashboard Chariow :

1. Allez dans **Paramètres** → **Pulses**
2. Ajoutez l'URL de webhook :
   - **URL** : `https://votre-domaine.vercel.app/api/payment/webhook`
   - **Événements** : Cochez tous les événements de vente et de licence

### Événements gérés :

| Événement | Action |
|-----------|--------|
| `successful.sale` | Active l'abonnement Premium |
| `abandoned.sale` | Marque le paiement comme annulé |
| `failed.sale` | Marque le paiement comme échoué |
| `license.issued` | Stocke la clé de licence |

---

## 📁 Architecture des fichiers

```
lib/
  chariow.ts          → Service principal Chariow (checkout, sales, licenses)

types/
  chariow.ts          → Types TypeScript pour les paiements

app/api/payment/
  subscribe/route.ts  → Crée un checkout Chariow pour l'abonnement
  request/route.ts    → Crée un checkout Chariow pour les bootcamps
  webhook/route.ts    → Réçoit les Pulses (webhooks) de Chariow
  check/[ref]/route.ts → Vérifie le statut d'une vente auprès de Chariow
  status/[ref]/route.ts → Lit le statut depuis la base de données
  ipn/route.ts        → Redirection de compatibilité vers /webhook

app/
  subscribe/page.tsx       → Page d'abonnement (simplifiée)
  payment/success/page.tsx → Page de confirmation

components/payment/
  payment-button.tsx       → Bouton de paiement (redirection directe)
```

---

## 🧪 Tester l'intégration

### 1. En local

```bash
# Démarrer le serveur
pnpm dev

# Exposer le webhook avec ngrok
ngrok http 3000

# Mettre à jour NEXT_PUBLIC_APP_URL avec l'URL ngrok
```

### 2. Vérifier le checkout

1. Allez sur `/subscribe`
2. Acceptez les CGV et cliquez sur **S'abonner**
3. Vous devriez être redirigé vers la page de checkout Chariow
4. Après paiement, vous serez redirigé vers `/payment/success`

### 3. Vérifier les webhooks

Consultez les logs dans le terminal pour voir :
```
📥 Chariow Pulse received: successful.sale
✅ Payment verified and activated
✅ User subscription activated: <user_id>
```

---

## 🔐 Sécurité

- La clé API Chariow (`sk_*`) ne doit **jamais** être exposée côté client
- Les Pulses sont envoyés par Chariow et validés côté serveur
- Les données bancaires sont traitées exclusivement par Chariow

---

## 📚 Documentation Chariow

- **API Docs** : https://docs.chariow.dev
- **Checkout API** : `POST https://api.chariow.com/v1/checkout`
- **Sales API** : `GET https://api.chariow.com/v1/sales/{saleId}`
- **Licenses API** : `https://api.chariow.com/v1/licenses`
- **Pulses (Webhooks)** : Configurés dans le dashboard Chariow
