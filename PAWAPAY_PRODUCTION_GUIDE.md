# Guide de bascule PawaPay en mode Production

Ce guide décrit, pas à pas, comment passer l'intégration PawaPay du sandbox
à la **production** sur la plateforme Big Five / Laveiye.

> Pré-requis : intégration sandbox déjà fonctionnelle (cf. [PAWAPAY_INTEGRATION.md](PAWAPAY_INTEGRATION.md)).

---

## 1. Conditions préalables côté PawaPay

Avant de pouvoir activer le compte production, PawaPay exige :

1. **Compte commercial validé** sur [dashboard.pawapay.io](https://dashboard.pawapay.io).
2. **KYB / Compliance** complétée :
   - Documents légaux de la société (RCCM, statuts).
   - Justificatif de compte bancaire de règlement.
   - Pièce d'identité du représentant légal.
3. **Contrat signé** avec PawaPay (Merchant Service Agreement).
4. **Activation des opérateurs (MMOs)** souhaités par pays
   (MTN MoMo, Orange Money, Moov Money, Free Money…).
   > ⚠️  **Wave n'est pas supporté par PawaPay**. Pour proposer Wave
   > (Sénégal / Côte d'Ivoire), utiliser PayTech.
   Chaque MMO doit être explicitement approuvé par PawaPay et l'opérateur.
5. **Plafonds & devises** définis (XOF par défaut pour la zone UEMOA).

> Le passage en production peut prendre **plusieurs jours à quelques semaines**
> selon la rapidité d'instruction côté PawaPay et opérateurs.
> Anticipez la demande au moins 2 semaines avant la mise en ligne prévue.

---

## 2. Récupérer les identifiants production

Dans le Dashboard PawaPay (mode **Production** sélectionné en haut à droite) :

1. **API → API tokens** → générer un nouveau token (rôle `Merchant API`).
   - Conservez-le précieusement : il n'est affiché qu'une seule fois.
   - Ne réutilisez **jamais** un token sandbox en production.
2. **Configuration → Active correspondents** : vérifier la liste des MMOs
   activés. Noter les codes (ex. `MTN_MOMO_CIV`, `ORANGE_CIV`, `MOOV_CIV`,
   `ORANGE_SEN`, `FREE_SEN`, `MTN_MOMO_BFA`…). Wave n'apparaitra pas —
   c'est normal, il n'est pas dans le catalogue PawaPay.
3. **Configuration → Callback URLs** : on les renseignera après le déploiement
   (voir étape 5).

---

## 3. Variables d'environnement (Vercel + `.env`)

Ouvrir le projet Vercel → **Settings → Environment Variables** et créer/mettre
à jour pour le scope **Production** :

| Variable | Valeur production |
|----------|-------------------|
| `PAWAPAY_ENV` | `production` |
| `PAWAPAY_API_TOKEN` | Token API généré à l'étape 2 (jamais committé) |
| `PAWAPAY_VERIFY_IP` | `true` |
| `NEXT_PUBLIC_APP_URL` | `https://<votre-domaine-prod>` (HTTPS obligatoire) |

> Conserver les valeurs sandbox sur les scopes **Preview** et **Development**
> (`PAWAPAY_ENV=sandbox`, token sandbox) afin de pouvoir continuer les tests
> sans impacter la prod.

Effets côté code (cf. [lib/pawapay.ts](lib/pawapay.ts)) :

- `PAWAPAY_BASE_URL` bascule de `api.sandbox.pawapay.io` vers `api.pawapay.io`.
- `isAllowedPawaPayIP()` valide les IPs production
  (`18.192.208.15`, `18.195.113.136`, `3.72.212.107`, `54.73.125.42`,
  `54.155.38.214`, `54.73.130.113`).
- Les URLs `successfulUrl` / `failedUrl` envoyées à PawaPay utilisent
  `NEXT_PUBLIC_APP_URL`.

---

## 4. Déployer la version production

```powershell
git checkout main
git pull
# Vérifier qu'aucune référence à *sandbox* ne reste dans le code applicatif
git push   # déclenche le déploiement Vercel sur le domaine prod
```

Une fois le déploiement terminé :

```powershell
# Smoke test : la base URL doit être l'API prod
curl -H "Authorization: Bearer $env:PAWAPAY_API_TOKEN" `
  https://api.pawapay.io/v2/active-conf
```

Doit retourner la configuration des MMOs activés sur votre compte.

---

## 5. Déclarer les Callback URLs production dans le Dashboard PawaPay

Dashboard PawaPay (mode Production) → **Configuration → Callback URLs**.
Renseigner exactement (remplacer le domaine) :

| Type    | URL |
|---------|-----|
| Deposit | `https://<domaine-prod>/api/payment/pawapay/callback/deposit` |
| Payout  | `https://<domaine-prod>/api/payment/pawapay/callback/payout`  |
| Refund  | `https://<domaine-prod>/api/payment/pawapay/callback/refund`  |

> ⚠️ Les callbacks production ne pointent **pas** vers ngrok ni vers une URL
> Vercel preview. Utiliser uniquement le domaine final, en HTTPS.

PawaPay envoie un test ping après enregistrement : la route doit répondre `200`.

---

## 6. Whitelist des IPs (sécurité)

Avec `PAWAPAY_VERIFY_IP=true`, les routes `/api/payment/pawapay/callback/*`
rejettent toute requête provenant d'une IP non listée dans
`PAWAPAY_ALLOWED_IPS.production` (cf. [lib/pawapay.ts](lib/pawapay.ts)).

Si vous utilisez un WAF / Cloudflare devant Vercel :

- Autoriser les IPs PawaPay à atteindre les routes `/api/payment/pawapay/callback/*`.
- Vérifier que l'IP source est bien transmise via `x-forwarded-for`
  (Vercel le fait nativement, Cloudflare nécessite l'option *True-Client-IP*).

---

## 7. Vérification de la base de données

S'assurer que la migration `scripts/add-pawapay-tables.sql` a été appliquée
sur la base **production** Supabase :

```powershell
# Via supabase CLI (linké au projet prod)
supabase db push
```

Tables attendues :

- `pawapay_deposits`
- `pawapay_payouts`
- `pawapay_refunds`

Vérifier les **policies RLS** : seules les routes API (service role) doivent
écrire ; lecture restreinte au propriétaire (`user_id = auth.uid()`).

---

## 8. Tests de bout en bout en production

> ⚠️ Les transactions production sont **réelles** : elles débitent un vrai
> numéro et déclenchent un vrai règlement. Faire les tests avec un montant
> minimal (ex. **100 XOF**) sur un numéro interne.

Checklist :

- [ ] Initier un **dépôt** depuis `/paywall` ou `/dashboard/brand-requests`
      avec un numéro MTN / Orange / Moov / Free Money réel (Wave non supporté).
- [ ] Recevoir le PIN sur le téléphone, valider la transaction.
- [ ] Vérifier dans Supabase que la ligne `pawapay_deposits` passe à
      `status='COMPLETED'` (mise à jour par le callback).
- [ ] Vérifier dans le Dashboard PawaPay → **Transactions** que le dépôt
      apparaît avec le bon `depositId`.
- [ ] Tester un échec (numéro qui refuse) → status `FAILED` côté DB.
- [ ] Tester un **refund** depuis l'admin (si flow exposé).
- [ ] Tester un **payout** (si flow exposé).
- [ ] Vérifier le **règlement bancaire** PawaPay → compte de la société
      sous 1 à 3 jours ouvrés (selon contrat).

---

## 9. Monitoring & supervision

- **Logs Vercel** : filtrer sur `/api/payment/pawapay/*` après chaque release.
- **Alertes Supabase** : créer une vue ou cron pour détecter les
  `pawapay_deposits` bloqués en `PENDING` depuis > 30 min.
- **Dashboard PawaPay → Reports** : reconciliation hebdomadaire entre
  transactions PawaPay, lignes Supabase, et règlements bancaires.
- **Webhook polling de secours** : la route
  `/api/payment/pawapay/status/[type]/[id]` permet de re-synchroniser
  manuellement une transaction si un callback a été perdu.

---

## 10. Rollback

En cas de problème majeur :

1. Vercel → **Settings → Environment Variables → Production** :
   repasser `PAWAPAY_ENV=sandbox` et restaurer le token sandbox.
2. Redéployer (ou re-promouvoir le précédent build).
3. Communiquer aux utilisateurs : suspension temporaire des paiements MoMo.
4. Conserver les lignes `pawapay_*` créées pendant l'incident pour
   reconciliation manuelle avec PawaPay.

---

## 11. Checklist finale avant Go-Live

- [ ] KYB validé, contrat signé, MMOs activés côté PawaPay.
- [ ] Token API production créé et stocké uniquement dans Vercel
      (jamais dans le repo).
- [ ] `PAWAPAY_ENV=production` + `PAWAPAY_VERIFY_IP=true` sur Vercel Production.
- [ ] `NEXT_PUBLIC_APP_URL` = domaine HTTPS définitif.
- [ ] Callback URLs production déclarées dans le Dashboard PawaPay.
- [ ] Migration Supabase appliquée en prod.
- [ ] Test réel 100 XOF réussi (deposit + callback + DB).
- [ ] Compte bancaire de règlement vérifié.
- [ ] Procédure de rollback documentée et testée.

Une fois toutes les cases cochées, l'intégration PawaPay est prête pour
le trafic production. ✅
