# 🚀 GUIDE DE DÉMARRAGE RAPIDE - Résolution Erreur HTTPS PayTech

## 🔴 Erreur actuelle
```
"ipn_url doit etre en https donné: 'http://localhost:3000/api/payment/ipn'"
```

**Cause** : PayTech exige HTTPS pour les URLs de callback (IPN, success, cancel)

---

## ✅ SOLUTION EN 5 MINUTES

### Méthode 1 : Avec ngrok (Recommandé - Tunnel HTTPS local)

#### 📦 Étape 1 : Installer ngrok

```bash
# macOS avec Homebrew
brew install ngrok/ngrok/ngrok
```

#### 🔑 Étape 2 : Configurer ngrok (une seule fois)

1. Créez un compte gratuit : https://dashboard.ngrok.com/signup
2. Copiez votre authtoken
3. Configurez :

```bash
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

#### 🚀 Étape 3 : Démarrer le tunnel (AUTOMATIQUE)

```bash
./start-ngrok.sh
```

Le script affichera :
```
✅ Tunnel ngrok actif !

📝 Configuration .env.local
Copiez ces lignes dans votre fichier .env.local :

NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
PAYTECH_IPN_URL=https://abc123.ngrok-free.app/api/payment/ipn
PAYTECH_SUCCESS_URL=https://abc123.ngrok-free.app/payment/success
PAYTECH_CANCEL_URL=https://abc123.ngrok-free.app/payment/cancel

🚀 Prochaines étapes
1. Mettez à jour .env.local avec les URLs ci-dessus
2. Démarrez votre serveur: npm run dev
3. Accédez à votre app: https://abc123.ngrok-free.app
```

#### 📝 Étape 4 : Mettre à jour .env.local

Ouvrez `.env.local` et remplacez les 4 lignes avec celles fournies par le script.

#### 🔄 Étape 5 : Redémarrer Next.js

```bash
# Dans votre terminal npm run dev : Ctrl+C
# Puis relancer
npm run dev
```

#### 🧪 Étape 6 : Tester

1. Ouvrez l'URL ngrok (ex: https://abc123.ngrok-free.app/subscribe)
2. Testez un paiement
3. ✅ Plus d'erreur HTTPS !

#### 🛑 Pour arrêter ngrok

```bash
./stop-ngrok.sh
```

---

### Méthode 2 : Manuel (si vous préférez contrôler)

#### Terminal 1 - Démarrer ngrok :
```bash
ngrok http 3000
```

Notez l'URL HTTPS affichée (ex: `https://abc123.ngrok-free.app`)

#### Terminal 2 - Mettre à jour .env.local :
```env
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
PAYTECH_IPN_URL=https://abc123.ngrok-free.app/api/payment/ipn
PAYTECH_SUCCESS_URL=https://abc123.ngrok-free.app/payment/success
PAYTECH_CANCEL_URL=https://abc123.ngrok-free.app/payment/cancel
```

#### Terminal 3 - Démarrer Next.js :
```bash
npm run dev
```

---

### Méthode 3 : Sans ngrok (Déploiement rapide sur Vercel)

Si vous voulez éviter ngrok, déployez directement :

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions
```

Vercel vous donnera une URL HTTPS (ex: `https://votre-app.vercel.app`)

Configurez PayTech avec cette URL en production.

---

## 📋 Checklist avant de tester

- [ ] ngrok installé et configuré
- [ ] Script `./start-ngrok.sh` exécuté
- [ ] URL HTTPS récupérée
- [ ] `.env.local` mis à jour avec les 4 URLs
- [ ] Next.js redémarré (`npm run dev`)
- [ ] Page ouverte via l'URL ngrok (pas localhost)
- [ ] Test de paiement effectué

---

## 🔍 Vérification

### Voir les requêtes en temps réel

Ouvrez http://localhost:4040 pour voir :
- Toutes les requêtes HTTP passant par ngrok
- Les webhooks IPN de PayTech
- Les headers et body des requêtes

### Vérifier les URLs configurées

```bash
cat .env.local | grep PAYTECH
```

Doit afficher :
```
PAYTECH_IPN_URL=https://....ngrok-free.app/api/payment/ipn
PAYTECH_SUCCESS_URL=https://....ngrok-free.app/payment/success
PAYTECH_CANCEL_URL=https://....ngrok-free.app/payment/cancel
```

---

## ⚠️ Important à savoir

### URL ngrok change à chaque redémarrage (compte gratuit)

À chaque nouvelle session :
1. Relancer `./start-ngrok.sh`
2. Mettre à jour `.env.local`
3. Redémarrer Next.js

### Compte ngrok payant (8$/mois)

Avantages :
- URL fixe (ne change jamais)
- Pas besoin de mettre à jour `.env.local`
- Meilleure stabilité

### Alternative : Domaine personnalisé + Vercel

Pour éviter ngrok en prod :
1. Déployez sur Vercel
2. Configurez un domaine
3. Mettez PayTech en mode production

---

## 🎯 Workflow quotidien

### Avec ngrok (développement local)

**Matin (début de session)** :
```bash
# Terminal 1
./start-ngrok.sh
# Copier les URLs affichées dans .env.local

# Terminal 2
npm run dev
# Ouvrir l'URL ngrok fournie
```

**Soir (fin de session)** :
```bash
# Ctrl+C dans les deux terminaux
./stop-ngrok.sh
```

### Avec Vercel (production/staging)

**Une seule fois** :
```bash
vercel
# Configuration automatique des URLs HTTPS
```

Tout est automatique ensuite !

---

## 💡 Astuces

### Éviter les "Visit Site" de ngrok

ngrok gratuit affiche un avertissement. Pour contourner :
1. Connectez-vous sur https://dashboard.ngrok.com
2. Ou utilisez l'API directement (déjà géré dans le script)

### Partager votre app en développement

Partagez l'URL ngrok avec des testeurs :
```
https://abc123.ngrok-free.app/subscribe
```

Ils peuvent tester les paiements en temps réel !

### Déboguer les webhooks IPN

1. Ouvrez http://localhost:4040
2. Onglet "Inspect"
3. Voyez les webhooks PayTech en direct

---

## 📞 Besoin d'aide ?

### ngrok ne démarre pas
```bash
# Vérifier l'installation
ngrok version

# Reconfigurer
ngrok config add-authtoken VOTRE_TOKEN
```

### URL pas en HTTPS dans .env.local
Vérifiez que vous avez bien mis à jour avec l'URL ngrok (commence par `https://`)

### Erreur persiste après configuration
1. Vérifiez `.env.local` → URLs en HTTPS
2. Redémarrez Next.js
3. Ouvrez via l'URL ngrok (pas localhost)
4. Testez un paiement

---

## 📚 Documentation complète

- Guide ngrok : `NGROK_SETUP.md`
- Guide environnement : `ENV_SETUP.md`
- Résolution erreurs : `RESOLUTION_ERREUR_500.md`

---

**Date** : 12 février 2026
**Prêt en** : ⏱️ 5 minutes
