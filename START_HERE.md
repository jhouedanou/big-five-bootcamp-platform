# 🚀 DÉMARRAGE IMMÉDIAT - 3 COMMANDES

## ❌ Votre erreur actuelle
```
"ipn_url doit etre en https donné: 'http://localhost:3000/api/payment/ipn'"
```

## ✅ Solution en 3 commandes

### 1. Installer ngrok
```bash
brew install ngrok/ngrok/ngrok
```

### 2. Configurer ngrok (créez d'abord un compte sur https://dashboard.ngrok.com/signup)
```bash
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

### 3. Démarrer le tunnel
```bash
./start-ngrok.sh
```

## 📝 Ensuite...

Le script affichera :
```
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
PAYTECH_IPN_URL=https://abc123.ngrok-free.app/api/payment/ipn
PAYTECH_SUCCESS_URL=https://abc123.ngrok-free.app/payment/success
PAYTECH_CANCEL_URL=https://abc123.ngrok-free.app/payment/cancel
```

**Copiez ces 4 lignes dans votre fichier `.env.local`**

## 🔄 Redémarrer Next.js
```bash
# Ctrl+C dans le terminal npm run dev
npm run dev
```

## 🧪 Tester
Ouvrez l'URL affichée par le script (ex: `https://abc123.ngrok-free.app/subscribe`)

## ✅ Terminé !
Plus d'erreur HTTPS, redirection vers PayTech fonctionnelle ! 🎉

---

## 📖 Plus d'infos
- Guide complet : `QUICK_FIX_HTTPS.md`
- Dépannage : `TROUBLESHOOTING.md`
