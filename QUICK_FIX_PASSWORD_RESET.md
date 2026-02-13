# 🔧 Solution Rapide : Réinitialisation de mot de passe

## ⚡ Actions immédiates (5 minutes)

### 1. Configurer les URLs dans Supabase

Aller sur : https://supabase.com/dashboard/project/jyycgendzegiazltvarx

**Authentication → URL Configuration**

**Site URL :**
```
http://localhost:3000
```

**Redirect URLs (ajouter ces 4 URLs) :**
```
http://localhost:3000/auth/callback
http://localhost:3000/update-password
https://v0-big-five-bootcamp-platform.vercel.app/auth/callback
https://v0-big-five-bootcamp-platform.vercel.app/update-password
```

### 2. Vérifier le template d'email

**Authentication → Email Templates → Reset Password**

Vérifier que le template contient :
```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

### 3. Tester

**Option A : Depuis l'application**
```bash
# Démarrer le serveur
pnpm dev

# Ouvrir
open http://localhost:3000/forgot-password
```

**Option B : Depuis Supabase Dashboard**
- Authentication → Users
- Cliquer sur les 3 points → Send password reset email

## ✅ Ce qui a été corrigé

1. ✅ Amélioration du callback `/auth/callback`
   - Détection du type "recovery"
   - Redirection forcée vers `/update-password`
   - Meilleure gestion des erreurs

2. ✅ Amélioration de `/forgot-password`
   - URL de redirection correcte
   - Paramètre `type=recovery` ajouté
   - Messages d'erreur plus clairs

3. ✅ Page d'erreur `/auth/auth-code-error`
   - Affiche les raisons possibles
   - Propose des solutions

4. ✅ Script de test `test-password-reset.sh`
   - Vérifie la configuration
   - Guide pas à pas

## 🔍 Diagnostic

Si ça ne marche toujours pas :

```bash
# Exécuter le script de test
./test-password-reset.sh
```

Ou vérifier manuellement :

1. **Console navigateur (F12)** : Regarder les erreurs
2. **Supabase Logs** : Dashboard → Logs → Auth Logs
3. **Email reçu ?** : Vérifier spam + attendre 2-3 minutes
4. **URL dans l'email** : Doit contenir `redirect_to=...auth/callback`

## 📚 Documentation complète

Pour plus de détails, voir : `FIX_PASSWORD_RESET.md`

## 🆘 Problèmes fréquents

### Email ne part pas
- ✅ Vérifier les logs Supabase
- ✅ Configurer SMTP custom (Authentication → SMTP Settings)
- ✅ Vérifier le spam

### Lien ne redirige pas
- ✅ Vérifier que les Redirect URLs sont configurées
- ✅ Vérifier que le middleware ne bloque pas `/auth/callback`
- ✅ Attendre 1-2 minutes que la config Supabase se propage

### "Lien expiré"
- ✅ Le token est valide 1h seulement
- ✅ Redemander un nouveau lien
- ✅ Ne pas utiliser deux fois le même lien

## 🎯 Workflow normal

1. Utilisateur clique sur "Mot de passe oublié"
2. Entre son email
3. Reçoit un email avec un lien
4. Clique sur le lien → redirigé vers `/auth/callback`
5. Le callback échange le code contre une session
6. Redirige vers `/update-password`
7. Utilisateur entre son nouveau mot de passe
8. Succès → redirigé vers `/dashboard`

---

**Durée de résolution :** 5-10 minutes
**Priorité :** Haute (fonctionnalité critique)
