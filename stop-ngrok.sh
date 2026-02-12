#!/bin/bash

# ============================================================================
# Script pour arrêter ngrok
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}🛑 Arrêt de ngrok...${NC}"
echo ""

# Lire le PID depuis le fichier
if [ -f /tmp/ngrok.pid ]; then
    NGROK_PID=$(cat /tmp/ngrok.pid)
    
    # Vérifier si le processus existe
    if kill -0 $NGROK_PID 2>/dev/null; then
        kill $NGROK_PID
        echo -e "${GREEN}✅ ngrok arrêté (PID: $NGROK_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Aucun processus ngrok trouvé avec PID: $NGROK_PID${NC}"
    fi
    
    rm /tmp/ngrok.pid
else
    # Essayer de trouver et tuer tous les processus ngrok
    PIDS=$(pgrep ngrok || true)
    
    if [ -n "$PIDS" ]; then
        echo "$PIDS" | xargs kill 2>/dev/null || true
        echo -e "${GREEN}✅ Tous les processus ngrok arrêtés${NC}"
    else
        echo -e "${YELLOW}⚠️  Aucun processus ngrok en cours d'exécution${NC}"
    fi
fi

# Nettoyer le fichier de log
rm -f /tmp/ngrok.log

echo ""
echo -e "${GREEN}✨ Nettoyage terminé${NC}"
echo ""
