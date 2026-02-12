# ⚡ Guide Rapide : Configurer PayTech sur Vercel

## 🎯 Votre site déployé
https://v0-big-five-bootcamp-platform.vercel.app

## 📝 Étapes de configuration (5 minutes)

### 1️⃣ Ajouter les variables d'environnement dans Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez **v0-big-five-bootcamp-platform**
3. **Settings** > **Environment Variables**
4. Ajoutez ces variables :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici

# PayTech
PAYTECH_API_KEY=votre_api_key_ici
PAYTECH_API_SECRET=votre_api_secret_ici
PAYTECH_ENV=test

# URLs de callback
NEXT_PUBLIC_APP_URL=https://v0-big-five-bootcamp-platform.vercel.app
PAYTECH_SUCCESS_URL=https://v0-big-five-bootcamp-platform.vercel.app/payment/success
PAYTECH_CANCEL_URL=https://v0-big-five-bootcamp-platform.vercel.app/payment/cancel
PAYTECH_IPN_URL=https://v0-big-five-bootcamp-platform.vercel.app/api/payment/ipn
```

### 2️⃣ Redéployer l'application

Après avoir ajouté les variables :
- Cliquez sur **Deployments**
- **Redeploy** le dernier déploiement

### 3️⃣ Configurer PayTech Dashboard

1. https://paytech.sn/dashboard
2. Menu **API / Intégration**
3. Configurez ces 3 URLs :

```
IPN        : https://v0-big-five-bootcamp-platform.vercel.app/api/payment/ipn
Succès     : https://v0-big-five-bootcamp-platform.vercel.app/payment/success
Annulation : https://v0-big-five-bootcamp-platform.vercel.app/payment/cancel
```

## ✅ Vérification

### Test 1 : Variables chargées
```bash
# Ouvrir votre site et tester un paiement
https://v0-big-five-bootcamp-platform.vercel.app/subscribe
```

### Test 2 : IPN accessible
```bash
curl -I https://v0-big-five-bootcamp-platform.vercel.app/api/payment/ipn
# Devrait retourner 405 (normal, seul POST accepté)
```

## 🎯 URLs finales

| Fonction | URL |
|----------|-----|
| 🌐 Site | https://v0-big-five-bootcamp-platform.vercel.app |
| 🔔 IPN | https://v0-big-five-bootcamp-platform.vercel.app/api/payment/ipn |
| ✅ Succès | https://v0-big-five-bootcamp-platform.vercel.app/payment/success |
| ❌ Annulation | https://v0-big-five-bootcamp-platform.vercel.app/payment/cancel |

## 📖 Documentation complète
Voir `VERCEL_PAYTECH_SETUP.md` pour plus de détails.

---

**Prêt en 5 minutes !** 🚀
