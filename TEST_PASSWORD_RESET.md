# ✅ Test de réinitialisation de mot de passe

## 📍 Pages existantes

✅ `/forgot-password` - Demande de réinitialisation  
✅ `/update-password` - Mise à jour du mot de passe  
✅ `/auth/callback` - Callback d'authentification  
✅ `/auth/auth-code-error` - Page d'erreur  

## 🧪 Test complet

### Étape 1 : Démarrer le serveur

```bash
pnpm dev
```

Ouvrir : http://localhost:3000

### Étape 2 : Tester le flow complet

1. **Aller sur la page "Mot de passe oublié"**
   ```
   http://localhost:3000/forgot-password
   ```

2. **Entrer votre email** et cliquer sur "Envoyer le lien"

3. **Vérifier votre boîte email** (+ spam)
   - Email reçu ? ✅
   - Lien présent dans l'email ? ✅

4. **Cliquer sur le lien** dans l'email
   - Redirigé vers `/auth/callback` ? ✅
   - Puis redirigé vers `/update-password` ? ✅

5. **Entrer le nouveau mot de passe**
   - Mot de passe >= 8 caractères ✅
   - Confirmation identique ✅
   - Cliquer sur "Mettre à jour"

6. **Vérification**
   - Message de succès ? ✅
   - Redirigé vers `/dashboard` ? ✅
   - Connexion avec le nouveau mot de passe ? ✅

## 🔍 Si ça ne marche pas

### Problème 1 : Email ne part pas

**Vérifier :**
```bash
# Dans la console du navigateur (F12)
# Vérifier les erreurs réseau
```

**Solutions :**
1. Vérifier les logs Supabase (Dashboard → Logs → Auth Logs)
2. Attendre 2-3 minutes (emails peuvent être lents)
3. Vérifier le dossier spam
4. Configurer SMTP dans Supabase

### Problème 2 : Lien ne redirige pas

**Vérifier dans Supabase Dashboard :**

1. **Settings → Authentication → URL Configuration**

   **Site URL :** `http://localhost:3000`

   **Redirect URLs :** Ajouter ces URLs
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/update-password
   https://v0-big-five-bootcamp-platform.vercel.app/auth/callback
   https://v0-big-five-bootcamp-platform.vercel.app/update-password
   ```

2. **Sauvegarder** et attendre 1-2 minutes

### Problème 3 : Page "Lien expiré"

**Causes :**
- Le lien expire après 1 heure
- Le lien a déjà été utilisé
- La session n'a pas été créée correctement

**Solution :**
1. Redemander un nouveau lien depuis `/forgot-password`
2. Utiliser le lien immédiatement
3. Ne pas utiliser le même lien deux fois

## 🎯 Workflow technique

```
User                    App                     Supabase
  |                      |                         |
  |--1. Email---------->|                         |
  |                     |--2. resetPasswordForEmail->|
  |                     |                         |
  |<-----------------3. Email avec lien-----------|
  |                     |                         |
  |--4. Clic lien------>|                         |
  |                     |--5. exchangeCodeForSession->|
  |                     |<----6. Session créée----|
  |                     |                         |
  |<-7. Redirect /update-password                |
  |                     |                         |
  |--8. Nouveau pwd---->|                         |
  |                     |--9. updateUser-------->|
  |                     |<----10. Success--------|
  |                     |                         |
  |<-11. Redirect /dashboard                     |
```

## 📋 Checklist de configuration Supabase

Aller sur : https://supabase.com/dashboard/project/jyycgendzegiazltvarx

### 1. URL Configuration ✓

- [ ] Site URL configurée
- [ ] Redirect URLs ajoutées (4 URLs)

### 2. Email Templates ✓

- [ ] Template "Reset Password" configuré
- [ ] Contient `{{ .ConfirmationURL }}`

### 3. SMTP (optionnel mais recommandé) ✓

- [ ] SMTP configuré (Gmail, SendGrid, etc.)
- [ ] Email de test envoyé avec succès

## 🚀 Test en production (Vercel)

Une fois que ça marche en local :

1. **Push le code sur GitHub**
   ```bash
   git add .
   git commit -m "Fix password reset flow"
   git push
   ```

2. **Vercel déploie automatiquement**

3. **Tester sur production**
   ```
   https://v0-big-five-bootcamp-platform.vercel.app/forgot-password
   ```

4. **Vérifier que les emails utilisent la bonne URL**
   - Le lien doit pointer vers `v0-big-five-bootcamp-platform.vercel.app`
   - Pas vers `localhost`

## 💡 Commandes utiles

```bash
# Démarrer le serveur
pnpm dev

# Tester l'accessibilité des pages
curl http://localhost:3000/forgot-password
curl http://localhost:3000/update-password
curl http://localhost:3000/auth/callback

# Voir les logs en temps réel
# Terminal 1 : pnpm dev
# Terminal 2 : tail -f .next/trace

# Script de test automatique
./test-password-reset.sh
```

## 📞 Support

Si le problème persiste :

1. **Vérifier les logs Supabase**
   - Dashboard → Logs → Auth Logs
   - Chercher les erreurs liées à `resetPasswordForEmail`

2. **Vérifier la console navigateur**
   - F12 → Console
   - Onglet Network
   - Chercher les requêtes vers Supabase

3. **Tester avec un autre email**
   - Peut-être que l'utilisateur n'existe pas
   - Créer un nouveau compte de test

---

**Dernière mise à jour :** 13 février 2026  
**Statut :** ✅ Pages existantes et fonctionnelles  
**Action requise :** Configurer les Redirect URLs dans Supabase
