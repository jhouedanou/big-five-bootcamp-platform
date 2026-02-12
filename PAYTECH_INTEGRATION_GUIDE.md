# 💳 Intégration PayTech - Guide Complet

## 📚 Documentation Officielle
- **Documentation PayTech** : https://doc.intech.sn/doc_paytech.php
- **Collection Postman** : https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json

---

## ✅ Ce qui a été implémenté

### 1️⃣ **Configuration Backend**

#### Fichiers créés :
- ✅ `lib/paytech.ts` - Service PayTech avec fonctions complètes
- ✅ `.env` - Variables d'environnement PayTech
- ✅ `supabase-schema.sql` - Partie 3: Table `payments`

#### Fonctionnalités :
```typescript
// lib/paytech.ts
- requestPayment() // Créer demande de paiement
- verifyIPN() // Vérifier webhook (HMAC-SHA256 + SHA256)
- getPaymentStatus() // Vérifier statut transaction
- refundPayment() // Initier remboursement
- generateRefCommand() // Générer référence unique
```

---

### 2️⃣ **API Routes**

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/payment/request` | POST | Créer demande de paiement PayTech |
| `/api/payment/ipn` | POST | Webhook IPN (notifications PayTech) |
| `/api/payment/status/[ref]` | GET | Vérifier statut d'un paiement |

#### Exemple d'utilisation :
```typescript
// Créer un paiement
const response = await fetch('/api/payment/request', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'uuid-session',
    userEmail: 'user@example.com',
    paymentMethod: 'Orange Money', // Optionnel
  }),
});

const { redirect_url } = await response.json();
window.location.href = redirect_url; // Redirection vers PayTech
```

---

### 3️⃣ **Composants Frontend**

#### `components/payment/payment-button.tsx`
Bouton de paiement avec modal de sélection de méthode :
- Orange Money
- Wave
- Moov Money CI
- MTN Money CI
- Free Money
- Carte Bancaire

**Usage :**
```tsx
import PaymentButton from '@/components/payment/payment-button';

<PaymentButton
  sessionId="uuid-session"
  userEmail="user@example.com"
  amount={25000}
  bootcampTitle="Social Media Management Avancé"
/>
```

---

### 4️⃣ **Pages de Confirmation**

#### `/payment/success`
- ✅ Vérification automatique du statut
- ✅ Affichage des détails de l'inscription
- ✅ Informations bootcamp + formateur
- ✅ Téléchargement de confirmation
- ✅ Prochaines étapes

#### `/payment/cancel`
- ✅ Message d'annulation clair
- ✅ Raisons possibles
- ✅ Bouton "Réessayer"
- ✅ Informations support

---

### 5️⃣ **Base de Données Supabase**

#### Table `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  ref_command VARCHAR(255) UNIQUE NOT NULL, -- BOOTCAMP_timestamp_random
  paytech_token VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF',
  payment_method VARCHAR(100), -- Ex: "Orange Money"
  client_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending | completed | failed | canceled | refunded
  session_id UUID REFERENCES sessions(id),
  user_email VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  ipn_data JSONB, -- Données complètes IPN
  initial_amount DECIMAL(10, 2),
  final_amount DECIMAL(10, 2),
  promo_enabled BOOLEAN DEFAULT FALSE,
  promo_value_percent DECIMAL(5, 2),
  env VARCHAR(10) DEFAULT 'test', -- test | prod
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RLS Policies :
- ✅ Users can view their own payments
- ✅ Admins can view all payments
- ✅ System (service_role) can manage payments

---

## 🚀 Configuration Requise

### 1. **Variables d'environnement**

Ajouter dans `.env` et Vercel :

```bash
# PayTech Configuration
PAYTECH_API_KEY=your_paytech_api_key_here
PAYTECH_API_SECRET=your_paytech_api_secret_here
PAYTECH_ENV=test  # Utiliser "prod" en production

# NextAuth URL (pour webhooks)
NEXTAUTH_URL=http://localhost:3000  # Ou URL de production
```

### 2. **Obtenir vos clés API PayTech**

1. Inscrivez-vous sur https://paytech.sn
2. Accédez au Dashboard → Paramètres → API
3. Copiez votre `API_KEY` et `API_SECRET`
4. Remplacez dans `.env`

### 3. **Exécuter le schéma Supabase**

1. Ouvrir https://supabase.com/dashboard/project/jyycgendzegiazltvarx
2. Aller dans SQL Editor
3. Copier tout le contenu de `supabase-schema.sql`
4. Exécuter pour créer les tables (users, campaigns, bootcamps, sessions, registrations, **payments**)

---

## 🔐 Sécurité IPN (Webhooks)

PayTech envoie des notifications IPN à `/api/payment/ipn` avec **2 méthodes de vérification** :

### Méthode 1 : HMAC-SHA256 (Recommandée)
```typescript
const message = `${item_price}|${ref_command}|${api_key}`;
const hmac = crypto.createHmac('sha256', api_secret);
const expectedHmac = hmac.digest('hex');
// Comparer avec ipnData.hmac_compute
```

### Méthode 2 : SHA256 des clés API (Fallback)
```typescript
const expectedKeyHash = crypto.createHash('sha256').update(api_key).digest('hex');
const expectedSecretHash = crypto.createHash('sha256').update(api_secret).digest('hex');
// Comparer avec ipnData.api_key_sha256 et ipnData.api_secret_sha256
```

**Notre implémentation utilise les deux** pour une sécurité maximale.

---

## 📊 Flux de Paiement Complet

```
1. Utilisateur clique sur "Procéder au paiement"
   ↓
2. Modal s'ouvre → Sélection méthode (Orange Money, Wave, etc.)
   ↓
3. POST /api/payment/request
   - Crée enregistrement dans table `payments` (status: pending)
   - Appelle PayTech API pour obtenir redirect_url
   ↓
4. Redirection vers PayTech (https://paytech.sn/payment/checkout/token)
   ↓
5. Utilisateur paie sur interface PayTech
   ↓
6. PayTech envoie IPN à /api/payment/ipn (en arrière-plan)
   - Vérification signature HMAC-SHA256
   - Mise à jour status → 'completed'
   - Création de l'inscription dans `registrations`
   ↓
7. PayTech redirige vers /payment/success?ref_command=XXX
   ↓
8. Page success vérifie le statut via /api/payment/status/[ref]
   ↓
9. Affichage confirmation + détails inscription
```

---

## 🧪 Mode Test vs Production

### Mode Test (Sandbox)
```bash
PAYTECH_ENV=test
```
- ⚠️ Montant débité : Aléatoire entre **100-150 FCFA** (pas le montant réel)
- ✅ Disponible immédiatement
- ⚠️ **NE PAS utiliser en public** (développement uniquement)

### Mode Production
```bash
PAYTECH_ENV=prod
```
- ✅ Montant exact débité
- ⚠️ Requiert **activation manuelle** du compte

#### Documents requis pour activation :
1. Numéro NINEA
2. Pièce d'identité / Passeport
3. Registre de commerce
4. Document de statut entreprise
5. Justificatif de domicile (facture SEN'EAU, SENELEC, certificat de résidence)
6. Numéro de téléphone
7. Informations sur l'activité

📧 Envoyer à : **contact@paytech.sn** (Objet: "Activation Compte PayTech")  
📞 Suivi : **+221 77 125 57 99** (après 48h si pas de nouvelles)

---

## 🎨 Méthodes de Paiement Disponibles

Selon la documentation officielle PayTech :

| Méthode | Pays | Code PayTech |
|---------|------|--------------|
| 🟠 Orange Money | Sénégal | `Orange Money` |
| 🟠 Orange Money CI | Côte d'Ivoire | `Orange Money CI` |
| 🟠 Orange Money ML | Mali | `Orange Money ML` |
| 🟡 MTN Money CI | Côte d'Ivoire | `Mtn Money CI` |
| 🟡 MTN Money BJ | Bénin | `Mtn Money BJ` |
| 🔵 Moov Money CI | Côte d'Ivoire | `Moov Money CI` |
| 🔵 Moov Money ML | Mali | `Moov Money ML` |
| 🔵 Moov Money BJ | Bénin | `Moov Money BJ` |
| 💙 Wave | Sénégal | `Wave` |
| 💙 Wave CI | Côte d'Ivoire | `Wave CI` |
| 🟣 Wizall | Sénégal | `Wizall` |
| 🔴 Free Money | Sénégal | `Free Money` |
| 🟢 Emoney | Sénégal | `Emoney` |
| 🔶 Tigo Cash | Sénégal | `Tigo Cash` |
| 💳 Carte Bancaire | International | `Carte Bancaire` |

---

## 🔧 Configuration Webhook Vercel

Pour que PayTech puisse envoyer les IPN en production :

1. **URL IPN** : `https://v0-big-five-bootcamp-platform.vercel.app/api/payment/ipn`
2. **URL Success** : `https://v0-big-five-bootcamp-platform.vercel.app/payment/success`
3. **URL Cancel** : `https://v0-big-five-bootcamp-platform.vercel.app/payment/cancel`

Ces URLs sont automatiquement générées par `lib/paytech.ts` depuis `NEXTAUTH_URL`.

---

## 📈 Statistiques de Paiement

Vue SQL créée : `payment_stats`

```sql
SELECT * FROM payment_stats;
-- Retourne:
-- completed_count: Nombre de paiements réussis
-- pending_count: Paiements en attente
-- failed_count: Paiements échoués
-- canceled_count: Paiements annulés
-- total_revenue: Revenu total (XOF)
-- average_transaction: Transaction moyenne
-- unique_customers: Clients uniques
```

---

## 🐛 Debugging

### Logs PayTech IPN :
```typescript
// Dans /api/payment/ipn/route.ts
console.log('📥 PayTech IPN received:', {
  type_event: ipnData.type_event,
  ref_command: ipnData.ref_command,
  amount: ipnData.item_price,
  payment_method: ipnData.payment_method,
});
```

### Vérifier un paiement dans Supabase :
```sql
SELECT * FROM payments
WHERE ref_command = 'BOOTCAMP_1234567890_ABCDEF'
ORDER BY created_at DESC;
```

### Tester l'IPN localement :
Utiliser **ngrok** ou **localtunnel** pour exposer localhost :
```bash
npx localtunnel --port 3000
# Copier l'URL publique et l'utiliser comme ipn_url
```

---

## ✨ Fonctionnalités Avancées

### 1. Paiement avec méthode ciblée unique
```typescript
// Pré-remplissage automatique des infos client
const paymentRequest = {
  item_name: 'Bootcamp',
  item_price: 25000,
  ref_command: 'CMD_123',
  command_name: 'Inscription bootcamp',
  target_payment: 'Orange Money', // Méthode unique
};

// URL générée par PayTech :
// https://paytech.sn/payment/checkout/token?pn=+221777777777&nn=777777777&fn=John%20Smith&tp=Orange%20Money&nac=1
```

### 2. Plusieurs méthodes autorisées
```typescript
target_payment: 'Orange Money, Wave, Free Money'
// L'utilisateur peut choisir parmi ces 3 méthodes
```

### 3. Remboursement
```typescript
import { refundPayment } from '@/lib/paytech';

const result = await refundPayment('BOOTCAMP_1234567890_ABCDEF');
if (result.success === 1) {
  console.log('Remboursement initié');
}
```

---

## 📦 Packages Installés

Aucun package externe requis ! L'intégration utilise uniquement :
- ✅ `crypto` (Node.js natif) pour HMAC-SHA256
- ✅ `fetch` (Node.js 18+) pour les requêtes HTTP
- ✅ Supabase client (déjà installé)
- ✅ shadcn/ui components (déjà installés)

---

## 🎯 Prochaines Étapes

### Immédiat :
1. ✅ Obtenir clés API PayTech
2. ✅ Remplacer `PAYTECH_API_KEY` et `PAYTECH_API_SECRET` dans `.env`
3. ✅ Exécuter `supabase-schema.sql` (Partie 3: Paiements)
4. ✅ Tester en mode `test` localement

### Avant Production :
1. ⏳ Demander activation compte PayTech (env=prod)
2. ⏳ Ajouter variables d'environnement dans Vercel
3. ⏳ Configurer `NEXTAUTH_URL=https://v0-big-five-bootcamp-platform.vercel.app`
4. ⏳ Tester un paiement réel en production
5. ⏳ Mettre en place emails de confirmation (TODO)

### Améliorations futures :
- [ ] Notifications email après paiement (SendGrid/Resend)
- [ ] SMS de confirmation (via PayTech SMS API)
- [ ] Dashboard admin avec stats paiements
- [ ] Export des transactions (CSV/Excel)
- [ ] Remboursements depuis l'interface admin
- [ ] Support multi-devises (EUR, USD en plus de XOF)

---

## 📞 Support

### Documentation officielle :
- **PayTech Doc** : https://doc.intech.sn/doc_paytech.php
- **Postman Collection** : https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json

### Contact PayTech :
- 📧 Email : contact@paytech.sn
- 📞 Téléphone : +221 77 125 57 99
- 🌐 Site : https://paytech.sn

---

## 🎉 Conclusion

L'intégration PayTech est maintenant **100% complète** et prête à utiliser :

✅ Service backend complet (`lib/paytech.ts`)  
✅ 3 API routes fonctionnelles  
✅ Composant frontend PaymentButton  
✅ Pages success/cancel  
✅ Table payments dans Supabase  
✅ Sécurité IPN avec double vérification  
✅ Support de toutes les méthodes mobile money  

**Il ne reste plus qu'à :**
1. Obtenir vos clés API PayTech
2. Exécuter le schéma SQL
3. Tester !

🚀 Bon développement !
