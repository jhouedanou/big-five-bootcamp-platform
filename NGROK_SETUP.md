# 🌐 Configuration ngrok pour PayTech (HTTPS requis)

## 🔴 Problème
PayTech refuse les URL IPN en HTTP :
```
"ipn_url doit etre en https donné: 'http://localhost:3000/api/payment/ipn'"
```

## ✅ Solution : Tunnel HTTPS avec ngrok

### Option 1 : Installation et utilisation de ngrok (RECOMMANDÉ)

#### Étape 1 : Installer ngrok

**macOS (via Homebrew)** :
```bash
brew install ngrok/ngrok/ngrok
```

**Ou téléchargement direct** :
1. Allez sur https://ngrok.com/download
2. Téléchargez pour macOS
3. Décompressez et déplacez dans `/usr/local/bin`

#### Étape 2 : Créer un compte ngrok (gratuit)

1. Allez sur https://dashboard.ngrok.com/signup
2. Créez un compte gratuit
3. Copiez votre **authtoken**

#### Étape 3 : Configurer ngrok

```bash
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

#### Étape 4 : Démarrer votre serveur Next.js

```bash
npm run dev
```

#### Étape 5 : Créer le tunnel HTTPS

Dans un **nouveau terminal** :

```bash
ngrok http 3000
```

Vous verrez quelque chose comme :
```
ngrok

Session Status                online
Account                       votre@email.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

#### Étape 6 : Mettre à jour .env.local

Copiez l'URL HTTPS ngrok (ex: `https://abc123.ngrok-free.app`) et mettez à jour :

```env
# Remplacez l'URL de l'application
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app

# Mettez à jour les URLs PayTech
PAYTECH_SUCCESS_URL=https://abc123.ngrok-free.app/payment/success
PAYTECH_CANCEL_URL=https://abc123.ngrok-free.app/payment/cancel
PAYTECH_IPN_URL=https://abc123.ngrok-free.app/api/payment/ipn
```

#### Étape 7 : Redémarrer le serveur

```bash
# Ctrl+C pour arrêter
npm run dev
```

#### Étape 8 : Tester le paiement

1. Ouvrez https://abc123.ngrok-free.app/subscribe
2. Testez un paiement

---

### Option 2 : Utiliser localhost.run (Alternative sans installation)

```bash
# Démarrez votre serveur
npm run dev

# Dans un autre terminal
ssh -R 80:localhost:3000 localhost.run
```

Vous obtiendrez une URL HTTPS temporaire.

---

### Option 3 : Désactiver la vérification HTTPS (DEV SEULEMENT)

⚠️ **Temporaire - Ne fonctionne que si PayTech le permet en mode test**

Modifiez `lib/paytech.ts` pour retirer l'IPN_URL en développement :

```typescript
// Temporairement commenter en dev local
// ipn_url: process.env.PAYTECH_IPN_URL,
```

Mais vous ne recevrez **pas les webhooks IPN** !

---

## 🚀 Configuration rapide (2 minutes)

### Script automatique

Créez un fichier `dev-with-ngrok.sh` :

```bash
#!/bin/bash

# Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok n'est pas installé"
    echo "Installation: brew install ngrok/ngrok/ngrok"
    exit 1
fi

# Démarrer ngrok en arrière-plan
echo "🌐 Démarrage du tunnel ngrok..."
ngrok http 3000 > /dev/null &
NGROK_PID=$!

# Attendre que ngrok démarre
sleep 3

# Récupérer l'URL publique
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[a-z0-9-]*\.ngrok-free\.app' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Impossible de récupérer l'URL ngrok"
    kill $NGROK_PID
    exit 1
fi

echo "✅ Tunnel ngrok actif: $NGROK_URL"
echo ""
echo "📝 Mettez à jour votre .env.local avec:"
echo "NEXT_PUBLIC_APP_URL=$NGROK_URL"
echo "PAYTECH_IPN_URL=$NGROK_URL/api/payment/ipn"
echo "PAYTECH_SUCCESS_URL=$NGROK_URL/payment/success"
echo "PAYTECH_CANCEL_URL=$NGROK_URL/payment/cancel"
echo ""
echo "🚀 Démarrez votre serveur: npm run dev"
echo "🌐 Accédez à: $NGROK_URL"
echo ""
echo "⏹️  Pour arrêter ngrok: kill $NGROK_PID"
```

Rendez-le exécutable :
```bash
chmod +x dev-with-ngrok.sh
./dev-with-ngrok.sh
```

---

## 📋 Workflow de développement avec ngrok

### Terminaux nécessaires

**Terminal 1 - ngrok** :
```bash
ngrok http 3000
```

**Terminal 2 - Next.js** :
```bash
npm run dev
```

### À chaque session de dev

1. Démarrer ngrok → noter l'URL HTTPS
2. Mettre à jour `.env.local` avec la nouvelle URL
3. Démarrer Next.js
4. Tester les paiements

⚠️ **Important** : L'URL ngrok change à chaque redémarrage (sauf avec un compte payant)

---

## 🎯 Vérification

Après configuration, testez :

```bash
# Vérifier que l'URL est bien en HTTPS
echo $PAYTECH_IPN_URL
# Doit afficher: https://....ngrok-free.app/api/payment/ipn

# Tester l'accessibilité de l'IPN
curl https://votre-url.ngrok-free.app/api/payment/ipn
```

---

## 🔄 Alternative : Mode production rapide

Si vous avez un serveur de production :

```env
# Production
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
PAYTECH_IPN_URL=https://votre-domaine.com/api/payment/ipn
PAYTECH_SUCCESS_URL=https://votre-domaine.com/payment/success
PAYTECH_CANCEL_URL=https://votre-domaine.com/payment/cancel
PAYTECH_ENV=production
```

Déployez sur Vercel/Netlify et testez directement en production.

---

## 📞 Ressources

- ngrok Dashboard : https://dashboard.ngrok.com
- Documentation ngrok : https://ngrok.com/docs
- PayTech API : https://paytech.sn/documentation

---

**Date** : 12 février 2026
