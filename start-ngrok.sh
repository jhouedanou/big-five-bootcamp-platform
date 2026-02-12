#!/bin/bash

# ============================================================================
# Script de développement avec ngrok pour PayTech
# ============================================================================
# Ce script démarre ngrok et affiche les URLs à configurer dans .env.local

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🌐 Configuration ngrok pour PayTech          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok n'est pas installé${NC}"
    echo ""
    echo "Installation rapide:"
    echo -e "${YELLOW}brew install ngrok/ngrok/ngrok${NC}"
    echo ""
    echo "Ou téléchargez depuis: https://ngrok.com/download"
    exit 1
fi

echo -e "${GREEN}✅ ngrok est installé${NC}"
echo ""

# Vérifier si ngrok est configuré (authtoken)
if ! ngrok config check &> /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok n'est pas configuré${NC}"
    echo ""
    echo "1. Créez un compte gratuit: https://dashboard.ngrok.com/signup"
    echo "2. Copiez votre authtoken"
    echo "3. Configurez: ${YELLOW}ngrok config add-authtoken VOTRE_TOKEN${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ ngrok est configuré${NC}"
echo ""

# Démarrer ngrok en arrière-plan
echo -e "${BLUE}🚀 Démarrage du tunnel ngrok...${NC}"
ngrok http 3000 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!

# Sauvegarder le PID pour pouvoir l'arrêter plus tard
echo $NGROK_PID > /tmp/ngrok.pid

echo -e "${YELLOW}   PID ngrok: $NGROK_PID${NC}"
echo ""

# Attendre que ngrok démarre (max 10 secondes)
echo -e "${BLUE}⏳ Attente du démarrage de ngrok...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""
echo ""

# Récupérer l'URL publique
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[a-z0-9-]*\.ngrok-free\.app' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}❌ Impossible de récupérer l'URL ngrok${NC}"
    echo ""
    echo "Vérifiez manuellement sur: http://localhost:4040"
    kill $NGROK_PID 2>/dev/null || true
    rm /tmp/ngrok.pid 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Tunnel ngrok actif !${NC}"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📝 Configuration .env.local                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Copiez ces lignes dans votre fichier .env.local :${NC}"
echo ""
echo "# ============================================"
echo "# URLs ngrok (HTTPS pour PayTech)"
echo "# ============================================"
echo "NEXT_PUBLIC_APP_URL=$NGROK_URL"
echo "PAYTECH_IPN_URL=$NGROK_URL/api/payment/ipn"
echo "PAYTECH_SUCCESS_URL=$NGROK_URL/payment/success"
echo "PAYTECH_CANCEL_URL=$NGROK_URL/payment/cancel"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Prochaines étapes                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. Mettez à jour .env.local avec les URLs ci-dessus"
echo "2. Démarrez votre serveur: ${GREEN}npm run dev${NC}"
echo "3. Accédez à votre app: ${GREEN}$NGROK_URL${NC}"
echo "4. Interface ngrok: ${GREEN}http://localhost:4040${NC}"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ℹ️  Informations                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "🌐 URL publique : $NGROK_URL"
echo "🔍 Dashboard    : http://localhost:4040"
echo "📝 PID ngrok    : $NGROK_PID"
echo ""
echo -e "${YELLOW}⚠️  Important :${NC}"
echo "- L'URL ngrok change à chaque redémarrage (compte gratuit)"
echo "- Mettez à jour .env.local à chaque nouvelle session"
echo "- Redémarrez Next.js après modification de .env.local"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🛑 Pour arrêter ngrok                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "Exécutez: ${RED}./stop-ngrok.sh${NC}"
echo "Ou: ${RED}kill $NGROK_PID${NC}"
echo ""
echo -e "${GREEN}✨ Tunnel HTTPS prêt pour PayTech !${NC}"
echo ""

# Garder le script actif
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter ngrok${NC}"
echo ""

# Attendre l'arrêt
wait $NGROK_PID
