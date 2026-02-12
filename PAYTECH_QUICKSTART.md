# 🚀 Démarrage Rapide - Intégration PayTech

## ⚡ Installation en 5 minutes

### 1. **Configurer les variables d'environnement**

Dans votre fichier `.env` :

```bash
# PayTech - Obtenir sur https://paytech.sn
PAYTECH_API_KEY=your_api_key_here
PAYTECH_API_SECRET=your_api_secret_here
PAYTECH_ENV=test  # ou "prod" après activation

# NextAuth URL (requis pour les webhooks)
NEXTAUTH_URL=http://localhost:3000
```

> 📝 **Note** : Pour obtenir vos clés API, inscrivez-vous sur https://paytech.sn → Dashboard → Paramètres → API

---

### 2. **Créer les tables Supabase**

1. Ouvrir https://supabase.com/dashboard/project/jyycgendzegiazltvarx
2. Aller dans **SQL Editor**
3. Copier tout le contenu de `supabase-schema.sql`
4. **Exécuter** (créera la table `payments` et ses policies)

---

### 3. **Utiliser le composant PaymentButton**

```tsx
import PaymentButton from '@/components/payment/payment-button';

<PaymentButton
  sessionId="uuid-de-la-session"
  userEmail="user@example.com"
  amount={25000}
  bootcampTitle="Social Media Management Avancé"
  onSuccess={() => console.log('Paiement initié')}
/>
```

**C'est tout !** 🎉

---

## 📋 Checklist de déploiement

### Développement (Mode Test)
- [x] Variables `.env` configurées
- [x] Table `payments` créée dans Supabase
- [x] Test du bouton de paiement
- [x] Vérification webhook IPN (localtunnel si local)

### Production
- [ ] Demander activation compte PayTech (voir ci-dessous)
- [ ] Ajouter variables dans Vercel
- [ ] Changer `PAYTECH_ENV=prod`
- [ ] Mettre à jour `NEXTAUTH_URL` avec URL production
- [ ] Tester paiement réel

---

## 🔑 Obtenir les clés API PayTech

### Inscription :
1. Aller sur https://paytech.sn
2. Créer un compte marchand
3. Dashboard → **Paramètres** → **API**
4. Copier `API_KEY` et `API_SECRET`

### Mode Test (Immédiat) :
✅ Disponible dès l'inscription  
⚠️ Débite 100-150 FCFA (pas le montant réel)  
⚠️ Uniquement pour tests internes

### Mode Production (Activation requise) :
📧 Email : contact@paytech.sn  
📋 Objet : "Activation Compte PayTech"  
📄 Documents : NINEA, ID, Registre commerce, etc.  
⏱️ Délai : 24-48h

---

## 🧪 Tester localement

### Exposer localhost pour IPN webhook :

```bash
# Option 1 : Localtunnel
npx localtunnel --port 3000

# Option 2 : Ngrok
ngrok http 3000
```

Copier l'URL publique et l'utiliser comme `NEXTAUTH_URL`.

---

## 🎯 Flux de paiement

```
User clique "Payer" 
  → Modal sélection méthode (Orange Money, Wave...)
  → POST /api/payment/request
  → Redirection vers PayTech
  → User paie sur PayTech
  → IPN envoyé à /api/payment/ipn
  → Redirection vers /payment/success
  → Vérification statut
  → Affichage confirmation ✅
```

---

## 🐛 Debugging

### Logs backend :
```bash
# Terminal
npm run dev

# Logs IPN apparaîtront dans la console :
📥 PayTech IPN received: { type_event: 'sale_complete', ... }
✅ PayTech IPN verified via HMAC-SHA256
✅ Payment processed successfully: BOOTCAMP_...
```

### Vérifier paiement dans Supabase :
```sql
SELECT * FROM payments
ORDER BY created_at DESC
LIMIT 10;
```

### Test webhook IPN manuellement :
Utiliser Postman avec la collection :  
https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json

---

## 📚 Documentation complète

Voir `PAYTECH_INTEGRATION_GUIDE.md` pour :
- Architecture détaillée
- Sécurité IPN (HMAC-SHA256)
- API Routes
- Types TypeScript
- Configuration avancée
- Statistiques paiements
- Remboursements

---

## 🎨 Personnalisation

### Modifier les méthodes de paiement :
```tsx
// components/payment/payment-button.tsx

const PAYMENT_METHODS = [
  { id: 'orange', name: 'Orange Money', value: 'Orange Money', icon: '🟠' },
  { id: 'wave', name: 'Wave', value: 'Wave', icon: '💙' },
  // Ajouter/retirer des méthodes ici
];
```

### Personnaliser les pages success/cancel :
```tsx
// app/payment/success/page.tsx
// app/payment/cancel/page.tsx
```

---

## 📞 Support

**PayTech** :
- 📧 contact@paytech.sn
- 📞 +221 77 125 57 99
- 📖 https://doc.intech.sn/doc_paytech.php

**Big Five Platform** :
- 📖 Voir `PAYTECH_INTEGRATION_GUIDE.md`
- 🐛 Ouvrir une issue GitHub

---

## ✨ Fonctionnalités

✅ Paiements mobile money (Orange, Wave, MTN, Moov, Free Money)  
✅ Carte bancaire Visa/Mastercard  
✅ Webhook IPN sécurisé (double vérification)  
✅ Pages de confirmation élégantes  
✅ Gestion des erreurs et annulations  
✅ Stockage Supabase avec RLS  
✅ Mode test & production  
✅ Prêt pour Vercel  

---

Bonne intégration ! 🚀
