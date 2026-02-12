#!/bin/bash

# ============================================================================
# Script d'affichage des URLs PayTech pour Vercel
# ============================================================================

VERCEL_URL="https://v0-big-five-bootcamp-platform.vercel.app"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Configuration PayTech pour Vercel                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ Site déployé :${NC}"
echo "   $VERCEL_URL"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📋 URLs À CONFIGURER DANS PAYTECH DASHBOARD${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}1️⃣  URL de notification instantanée (IPN / Webhook)${NC}"
echo "   $VERCEL_URL/api/payment/ipn"
echo ""
echo "   📝 Fonction : Reçoit les webhooks après chaque paiement"
echo ""

echo -e "${GREEN}2️⃣  URL de redirection en cas de succès${NC}"
echo "   $VERCEL_URL/payment/success"
echo ""
echo "   📝 Fonction : Page de confirmation après paiement réussi"
echo ""

echo -e "${GREEN}3️⃣  URL de redirection en cas d'annulation${NC}"
echo "   $VERCEL_URL/payment/cancel"
echo ""
echo "   📝 Fonction : Page d'information si paiement annulé"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🔧 VARIABLES D'ENVIRONNEMENT POUR VERCEL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "NEXT_PUBLIC_APP_URL=$VERCEL_URL"
echo "PAYTECH_IPN_URL=$VERCEL_URL/api/payment/ipn"
echo "PAYTECH_SUCCESS_URL=$VERCEL_URL/payment/success"
echo "PAYTECH_CANCEL_URL=$VERCEL_URL/payment/cancel"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📖 INSTRUCTIONS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "1. Allez sur PayTech Dashboard : ${GREEN}https://paytech.sn/dashboard${NC}"
echo "2. Menu API / Intégration"
echo "3. Copiez-collez les 3 URLs ci-dessus"
echo "4. Enregistrez"
echo ""

echo "5. Allez sur Vercel Dashboard : ${GREEN}https://vercel.com/dashboard${NC}"
echo "6. Projet > Settings > Environment Variables"
echo "7. Ajoutez les 4 variables ci-dessus"
echo "8. Redéployez l'application"
echo ""

echo -e "${GREEN}✨ Documentation complète : VERCEL_QUICK_SETUP.md${NC}"
echo ""
