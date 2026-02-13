# 🔧 Correction : Réinitialisation de mot de passe Supabase

## 🎯 Problème identifié

Lorsque vous réinitialisez un mot de passe depuis le Dashboard Supabase, "rien ne se passe". Voici les causes possibles :

### Causes principales :

1. **URLs de redirection non configurées dans Supabase**
2. **Email templates mal configurés**
3. **Le lien de réinitialisation pointe vers une mauvaise URL**
4. **SMTP non configuré (emails ne partent pas)**

## ✅ Solution étape par étape

### Étape 1 : Configurer les URLs de redirection dans Supabase

1. **Aller sur le Dashboard Supabase**
   ```
   https://supabase.com/dashboard/project/jyycgendzegiazltvarx
   ```

2. **Authentication → URL Configuration**
   - Cliquer sur **Settings** (⚙️)
   - Cliquer sur **Authentication**
   - Scroller jusqu'à **Redirect URLs**

3. **Ajouter ces URLs** (cliquer sur "Add URL" pour chaque) :

   **Pour le développement local :**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/update-password
   ```

   **Pour la production Vercel :**
   ```
   https://v0-big-five-bootcamp-platform.vercel.app/auth/callback
   https://v0-big-five-bootcamp-platform.vercel.app/update-password
   ```

4. **Site URL** (en haut de la page) :
   - Development : `http://localhost:3000`
   - Production : `https://v0-big-five-bootcamp-platform.vercel.app`

### Étape 2 : Vérifier le template d'email

1. **Authentication → Email Templates**
2. **Sélectionner "Reset Password"**
3. **Vérifier le template** (devrait contenir) :

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

4. **Important** : Vérifier que `{{ .ConfirmationURL }}` est présent

### Étape 3 : Configurer SMTP (Emails)

**Option A : Utiliser l'email Supabase par défaut (limité)**
- Par défaut, Supabase envoie 4 emails/heure
- Suffisant pour les tests

**Option B : Configurer un SMTP personnalisé (recommandé pour production)**

1. **Authentication → Email Templates → SMTP Settings**
2. **Activer "Enable Custom SMTP"**
3. **Configurer avec un service email** (exemples) :

   **Gmail :**
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: votre.email@gmail.com
   Password: [App Password]
   Sender email: votre.email@gmail.com
   Sender name: Big Five Bootcamp
   ```

   **SendGrid (recommandé) :**
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [SendGrid API Key]
   Sender email: noreply@votredomaine.com
   Sender name: Big Five Bootcamp
   ```

### Étape 4 : Tester la réinitialisation

#### Test 1 : Depuis l'application

1. **Aller sur** `http://localhost:3000/forgot-password`
2. **Entrer votre email**
3. **Cliquer sur "Envoyer le lien"**
4. **Vérifier votre boîte email** (y compris spam)
5. **Cliquer sur le lien** dans l'email
6. **Vous devriez arriver** sur `/update-password`

#### Test 2 : Depuis le Dashboard Supabase

1. **Authentication → Users**
2. **Trouver votre utilisateur**
3. **Cliquer sur les 3 points** → **Send password reset email**
4. **Vérifier votre boîte email**
5. **Cliquer sur le lien**
6. **Vous devriez arriver** sur `/update-password`

### Étape 5 : Vérifier les logs

Si ça ne marche toujours pas :

1. **Supabase Dashboard → Logs**
2. **Auth Logs** : Vérifier les tentatives de reset
3. **API Logs** : Vérifier les erreurs

**Exemples d'erreurs courantes :**
```
❌ "Redirect URL not allowed"
→ Ajouter l'URL dans Redirect URLs

❌ "Email not found"
→ L'utilisateur n'existe pas

❌ "SMTP error"
→ Vérifier la configuration SMTP

❌ "Rate limit exceeded"
→ Attendre ou configurer SMTP custom
```

## 🔍 Diagnostic avancé

### Vérifier le callback

Ouvrez le fichier `app/auth/callback/route.ts` et vérifiez qu'il gère bien le type "recovery" :

```typescript
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error) {
            // ✅ La session est créée, rediriger vers update-password
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

### Tester manuellement le lien

Si vous recevez l'email, le lien ressemble à :
```
https://jyycgendzegiazltvarx.supabase.co/auth/v1/verify?
  token=...&
  type=recovery&
  redirect_to=http://localhost:3000/auth/callback?next=/update-password
```

**Vérifier :**
- ✅ `type=recovery` est présent
- ✅ `redirect_to` pointe vers votre domaine
- ✅ Le token n'est pas expiré (valide 1h)

## 🛠️ Solutions aux problèmes courants

### Problème 1 : Email ne part pas

**Symptôme :** Toast "Email envoyé" mais rien dans la boîte

**Solutions :**
1. Vérifier le spam
2. Attendre 2-3 minutes (peut être lent)
3. Vérifier les logs Supabase
4. Configurer SMTP custom

### Problème 2 : Lien cliqué mais rien ne se passe

**Symptôme :** Cliquer sur le lien ne redirige nulle part

**Solutions :**
1. Vérifier que l'URL est dans les Redirect URLs autorisées
2. Vérifier que le middleware ne bloque pas `/auth/callback`
3. Ouvrir la console navigateur pour voir les erreurs

### Problème 3 : Page "Lien expiré"

**Symptôme :** La page `/update-password` affiche "Lien expiré"

**Solutions :**
1. Le token a expiré (valide 1h) → Redemander un nouveau lien
2. Le code n'a pas été échangé correctement → Vérifier le callback
3. La session n'est pas persistée → Vérifier les cookies

### Problème 4 : Erreur "Redirect URL not allowed"

**Symptôme :** Erreur dans la console ou logs Supabase

**Solution :**
1. Aller dans **Authentication → URL Configuration**
2. Ajouter l'URL exacte dans **Redirect URLs**
3. Attendre 1-2 minutes que ça se propage
4. Retester

## 🎬 Procédure de test complète

### Test en local (localhost)

```bash
# 1. Démarrer le serveur
pnpm dev

# 2. Ouvrir le navigateur
open http://localhost:3000/forgot-password

# 3. Entrer votre email
# 4. Vérifier votre boîte email
# 5. Cliquer sur le lien
# 6. Arriver sur /update-password
# 7. Changer le mot de passe
# 8. Se connecter avec le nouveau mot de passe
```

### Test en production (Vercel)

```bash
# 1. Ouvrir le site de production
open https://v0-big-five-bootcamp-platform.vercel.app/forgot-password

# 2. Entrer votre email
# 3. Vérifier votre boîte email
# 4. Cliquer sur le lien
# 5. Arriver sur /update-password
# 6. Changer le mot de passe
# 7. Se connecter avec le nouveau mot de passe
```

## 📋 Checklist de configuration

Cochez chaque élément :

- [ ] ✅ URLs de redirection ajoutées dans Supabase
- [ ] ✅ Site URL configurée (local + prod)
- [ ] ✅ Template email "Reset Password" configuré
- [ ] ✅ SMTP configuré (ou email Supabase activé)
- [ ] ✅ Page `/update-password` fonctionne
- [ ] ✅ Callback `/auth/callback` fonctionne
- [ ] ✅ Test réinitialisation depuis l'app OK
- [ ] ✅ Test réinitialisation depuis Dashboard OK

## 🚀 Amélioration : Auto-création du profil

Quand un utilisateur réinitialise son mot de passe, assurez-vous qu'il a un profil dans `public.users` :

Le callback actuel le fait déjà :

```typescript
// Auto-créer le profil dans public.users si manquant
if (user) {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

    if (!existing) {
        await admin.from('users').upsert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email!.split('@')[0],
            role: 'user',
            plan: 'Free',
            status: 'active',
        }, { onConflict: 'id' })
    }
}
```

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. **Vérifier les logs Supabase** : Dashboard → Logs → Auth Logs
2. **Vérifier la console navigateur** : F12 → Console → Network
3. **Tester avec un autre email**
4. **Vérifier que l'utilisateur existe bien dans Supabase**

---

**Note :** Ce guide corrige le problème de réinitialisation de mot de passe où "rien ne se passe" après avoir cliqué sur le lien depuis Supabase.
