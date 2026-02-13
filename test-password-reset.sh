#!/bin/bash

# Script de test de la réinitialisation de mot de passe
# Ce script vérifie que toutes les URLs et configurations sont correctes

echo "🔐 Test de réinitialisation de mot de passe Supabase"
echo "=================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"

echo "📍 Configuration détectée:"
echo "   Base URL: $BASE_URL"
echo "   Supabase URL: $SUPABASE_URL"
echo ""

# Test 1 : Vérifier que les pages existent
echo "1️⃣  Vérification des pages..."

test_page() {
    local url=$1
    local name=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo -e "   ${GREEN}✓${NC} $name accessible"
        return 0
    else
        echo -e "   ${RED}✗${NC} $name non accessible"
        return 1
    fi
}

test_page "$BASE_URL/forgot-password" "Page mot de passe oublié"
test_page "$BASE_URL/update-password" "Page mise à jour mot de passe"
test_page "$BASE_URL/auth/callback" "Callback d'authentification"
test_page "$BASE_URL/auth/auth-code-error" "Page d'erreur"

echo ""

# Test 2 : Vérifier les variables d'environnement
echo "2️⃣  Vérification des variables d'environnement..."

check_env() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "   ${RED}✗${NC} $var_name non définie"
        return 1
    else
        echo -e "   ${GREEN}✓${NC} $var_name définie"
        return 0
    fi
}

# Charger les variables depuis .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

check_env "NEXT_PUBLIC_SUPABASE_URL"
check_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env "SUPABASE_SERVICE_ROLE_KEY"

echo ""

# Test 3 : Instructions pour tester manuellement
echo "3️⃣  Test manuel à effectuer:"
echo ""
echo "   ${YELLOW}A. Depuis l'application:${NC}"
echo "      1. Ouvrir: $BASE_URL/forgot-password"
echo "      2. Entrer votre email"
echo "      3. Cliquer sur 'Envoyer le lien'"
echo "      4. Vérifier votre boîte email (+ spam)"
echo "      5. Cliquer sur le lien dans l'email"
echo "      6. Vérifier que vous arrivez sur /update-password"
echo ""
echo "   ${YELLOW}B. Depuis le Dashboard Supabase:${NC}"
echo "      1. Ouvrir: https://supabase.com/dashboard/project/jyycgendzegiazltvarx"
echo "      2. Aller dans Authentication → Users"
echo "      3. Cliquer sur les 3 points d'un utilisateur"
echo "      4. Cliquer sur 'Send password reset email'"
echo "      5. Vérifier votre boîte email"
echo "      6. Cliquer sur le lien"
echo "      7. Vérifier que vous arrivez sur /update-password"
echo ""

# Test 4 : Configuration Supabase à vérifier
echo "4️⃣  Configuration Supabase à vérifier:"
echo ""
echo "   ${YELLOW}Dans le Dashboard Supabase → Authentication → URL Configuration:${NC}"
echo ""
echo "   Site URL:"
echo "      • Development: http://localhost:3000"
echo "      • Production: https://v0-big-five-bootcamp-platform.vercel.app"
echo ""
echo "   Redirect URLs (ajouter toutes ces URLs):"
echo "      • http://localhost:3000/auth/callback"
echo "      • http://localhost:3000/update-password"
echo "      • https://v0-big-five-bootcamp-platform.vercel.app/auth/callback"
echo "      • https://v0-big-five-bootcamp-platform.vercel.app/update-password"
echo ""

# Test 5 : Email template
echo "5️⃣  Template d'email à vérifier:"
echo ""
echo "   ${YELLOW}Dans le Dashboard Supabase → Authentication → Email Templates:${NC}"
echo "   Sélectionner 'Reset Password' et vérifier que le template contient:"
echo ""
echo "   <a href=\"{{ .ConfirmationURL }}\">Reset Password</a>"
echo ""

# Résumé
echo "=================================================="
echo ""
echo "📋 Checklist de configuration:"
echo ""
echo "   □ Variables d'environnement définies (.env)"
echo "   □ Site URL configurée dans Supabase"
echo "   □ Redirect URLs ajoutées dans Supabase"
echo "   □ Template email 'Reset Password' configuré"
echo "   □ SMTP configuré (ou email Supabase activé)"
echo "   □ Test manuel depuis l'app réussi"
echo "   □ Test manuel depuis Dashboard réussi"
echo ""
echo "Si un test échoue, consultez le guide: FIX_PASSWORD_RESET.md"
echo ""
