# 🎯 Résolution des Erreurs - Guide Complet

## 🚨 Erreurs actuelles identifiées

### ❌ Erreur 1 : Variables d'environnement manquantes
**Symptôme** : 
```
POST /api/payment/subscribe 500 (Internal Server Error)
Failed to create payment record
```

**Solution** : Créer `.env.local` → Voir `ENV_SETUP.md`

---

### ❌ Erreur 2 : HTTPS requis par PayTech
**Symptôme** :
```
"ipn_url doit etre en https donné: 'http://localhost:3000/api/payment/ipn'"
```

**Solution** : Utiliser ngrok → **Voir `QUICK_FIX_HTTPS.md` (START HERE! 🚀)**

---

## ✅ SOLUTION COMPLÈTE EN 3 ÉTAPES

### 1️⃣ Configurer les variables d'environnement

```bash
# Copier le template
cp .env.example .env.local

# Éditer et remplir vos clés
# - Supabase : https://supabase.com/dashboard
# - PayTech : https://paytech.sn/dashboard
```

📖 **Guide détaillé** : `ENV_SETUP.md`

---

### 2️⃣ Créer le tunnel HTTPS avec ngrok

```bash
# Installer ngrok
brew install ngrok/ngrok/ngrok

# Configurer (une fois)
ngrok config add-authtoken VOTRE_TOKEN

# Démarrer le tunnel
./start-ngrok.sh

# Copier les URLs affichées dans .env.local
# Redémarrer : npm run dev
```

📖 **Guide détaillé** : `QUICK_FIX_HTTPS.md` ⭐

---

### 3️⃣ Créer la table payments dans Supabase

1. Ouvrez Supabase SQL Editor
2. Exécutez `scripts/fix-payments-table-v2.sql`
3. Vérifiez la création

📖 **Guide détaillé** : `FIX_ERROR_500.md`

---

## 🧪 Vérification complète

```bash
# Diagnostic automatique
node scripts/diagnose-payment-error.js
```

**Résultat attendu** :
```
✅ Connexion Supabase OK
✅ Table payments existe
✅ Variables PayTech configurées
✅ DIAGNOSTIC TERMINÉ
```

---

## 🚀 Démarrage rapide

### Workflow quotidien de développement

**Terminal 1 - Tunnel HTTPS** :
```bash
./start-ngrok.sh
# Copier les URLs dans .env.local
```

**Terminal 2 - Serveur Next.js** :
```bash
npm run dev
# Ouvrir l'URL ngrok fournie (pas localhost)
```

**Arrêt** :
```bash
./stop-ngrok.sh
```

---

## 📁 Fichiers de référence

| Fichier | Description | Priorité |
|---------|-------------|----------|
| **QUICK_FIX_HTTPS.md** | ⭐ Guide rapide HTTPS avec ngrok | 🔥 **À LIRE EN PREMIER** |
| **ENV_SETUP.md** | Configuration des variables d'environnement | 📝 Essentiel |
| **FIX_ERROR_500.md** | Résolution erreur 500 détaillée | 🔧 Dépannage |
| **RESOLUTION_ERREUR_500.md** | Récapitulatif complet des erreurs | 📋 Vue d'ensemble |
| **NGROK_SETUP.md** | Documentation complète ngrok | 📖 Référence |
| `.env.example` | Template des variables d'environnement | 📄 Template |
| `start-ngrok.sh` | Script automatique tunnel HTTPS | 🤖 Script |
| `stop-ngrok.sh` | Arrêter ngrok proprement | 🛑 Script |
| `scripts/diagnose-payment-error.js` | Diagnostic automatique | 🔍 Outil |
| `scripts/fix-payments-table-v2.sql` | Migration SQL table payments | 🗄️ SQL |

---

## 🎯 Checklist complète avant test

### Configuration initiale (une fois)
- [ ] ngrok installé : `brew install ngrok/ngrok/ngrok`
- [ ] ngrok configuré : `ngrok config add-authtoken TOKEN`
- [ ] `.env.local` créé avec les clés Supabase et PayTech
- [ ] Migration SQL exécutée dans Supabase

### Chaque session de développement
- [ ] Tunnel ngrok démarré : `./start-ngrok.sh`
- [ ] `.env.local` mis à jour avec URLs ngrok
- [ ] Serveur Next.js (re)démarré : `npm run dev`
- [ ] Page ouverte via URL ngrok (HTTPS)
- [ ] Test de paiement effectué

### Vérification
- [ ] Diagnostic OK : `node scripts/diagnose-payment-error.js`
- [ ] Aucune erreur 500 dans la console
- [ ] Redirection vers PayTech fonctionnelle
- [ ] Dashboard ngrok accessible : http://localhost:4040

---

## 🏆 Ordre de lecture recommandé

Pour résoudre rapidement :

1. **QUICK_FIX_HTTPS.md** ⭐ (5 min) - Fix HTTPS avec ngrok
2. **ENV_SETUP.md** (3 min) - Configuration .env.local
3. **FIX_ERROR_500.md** (2 min) - Migration SQL
4. Tester ! 🎉

Pour comprendre en profondeur :

1. **RESOLUTION_ERREUR_500.md** - Vue d'ensemble
2. **NGROK_SETUP.md** - Détails techniques ngrok
3. **OPERATOR_SELECTION_UPDATE.md** - Features UI

---

## 💡 Tips & Astuces

### Éviter de reconfigurer ngrok chaque fois

**Option 1** : Compte ngrok payant (8$/mois)
- URL fixe qui ne change jamais
- Pas besoin de mettre à jour `.env.local`

**Option 2** : Déployer sur Vercel
```bash
npm i -g vercel
vercel
```
URL HTTPS permanente + déploiement automatique

### Déboguer les webhooks PayTech

1. Ouvrez http://localhost:4040
2. Onglet "Inspect" 
3. Voyez les requêtes IPN en temps réel

### Tester avec de vrais numéros

Mode test PayTech accepte des numéros test :
- Orange CI : +2250777000000
- MTN CI : +2250555000000
- Wave SN : +221700000000

Consultez la doc PayTech pour la liste complète.

---

## 🚨 Problèmes fréquents

### "ngrok not found"
```bash
brew install ngrok/ngrok/ngrok
```

### "authtoken not configured"
```bash
ngrok config add-authtoken VOTRE_TOKEN
```
Token disponible sur : https://dashboard.ngrok.com

### Erreur persiste après config ngrok
1. Vérifiez `.env.local` → URLs commencent par `https://`
2. Redémarrez Next.js (Ctrl+C puis `npm run dev`)
3. Ouvrez via l'URL ngrok (pas localhost:3000)

### URL ngrok ne fonctionne pas
- Vérifiez que ngrok tourne : `ps aux | grep ngrok`
- Vérifiez le dashboard : http://localhost:4040
- Relancez : `./start-ngrok.sh`

---

## 📞 Support

### Ressources externes
- **ngrok** : https://ngrok.com/docs
- **PayTech** : https://paytech.sn/documentation
- **Supabase** : https://supabase.com/docs

### Scripts de diagnostic
```bash
# Test complet
node scripts/diagnose-payment-error.js

# Test PayTech
node scripts/test-paytech.js

# Voir les logs ngrok
tail -f /tmp/ngrok.log
```

---

## 🎉 Résultat final attendu

Après avoir suivi tous les guides :

✅ Pas d'erreur 500  
✅ URLs en HTTPS valides  
✅ Redirection PayTech fonctionnelle  
✅ Webhooks IPN reçus  
✅ Paiements enregistrés en base  
✅ Abonnements activés automatiquement  

**Prêt à accepter des paiements ! 🚀💰**

---

**Dernière mise à jour** : 12 février 2026
