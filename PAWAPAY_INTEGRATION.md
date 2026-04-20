# Intégration PawaPay — Callbacks

Intégration de [PawaPay Merchant API v2](https://docs.pawapay.io/v2/docs/what_to_know)
pour accepter des paiements mobile money (deposits) et gérer payouts & refunds.

## Architecture

```
┌───────────────┐                          ┌──────────────┐
│   Frontend    │ 1. POST /deposit         │   Next.js    │
│  (paywall,    │ ────────────────────────▶│  API routes  │
│ subscribe..)  │                          └──────┬───────┘
└───────▲───────┘                                 │
        │                                         │ 2. POST /v2/deposits
        │                                         ▼
        │                                  ┌──────────────┐
        │ 5. Redirige / update UI         │   PawaPay    │
        │                                  │ Merchant API │
        │                                  └──────┬───────┘
        │                                         │
        │                                         │ 3. Client paie
        │                                         ▼
        │                                  ┌──────────────┐
        │                                  │   MMO (MTN,  │
        │                                  │  Wave, Orange)│
        │                                  └──────┬───────┘
        │                                         │
        │                                         │ 4. Callback (webhook)
        │                                         ▼
        │                                  ┌──────────────┐
        └────── supabase realtime ─────────│  /callback/  │
                                           │   deposit    │
                                           └──────────────┘
```

## Fichiers

| Fichier | Rôle |
|---------|------|
| `lib/pawapay.ts` | Client HTTP + types + IP whitelist |
| `app/api/payment/pawapay/deposit/route.ts` | Initier un dépôt (collecte) |
| `app/api/payment/pawapay/callback/deposit/route.ts` | **Callback** dépôt |
| `app/api/payment/pawapay/callback/payout/route.ts` | **Callback** payout |
| `app/api/payment/pawapay/callback/refund/route.ts` | **Callback** refund |
| `app/api/payment/pawapay/status/[type]/[id]/route.ts` | Polling de secours |
| `scripts/add-pawapay-tables.sql` | Migration Supabase |

## Variables d'environnement

Ajoutez dans `.env.local` (et Vercel) :

```bash
# Environnement PawaPay
PAWAPAY_ENV=sandbox                # ou "production"

# Token API (Dashboard → API tokens)
PAWAPAY_API_TOKEN=eyJhbGciOi...

# (optionnel) Activer la vérification IP des callbacks
PAWAPAY_VERIFY_IP=true             # en prod uniquement, voir IPs plus bas

# URL publique de votre app (pour les callback URLs + successfulUrl/failedUrl)
NEXT_PUBLIC_APP_URL=https://big-five-bootcamp.vercel.app
```

## Déclaration des callback URLs dans le Dashboard PawaPay

Les URLs de callback se configurent **côté Dashboard** PawaPay :
[docs.pawapay.io/dashboard/other/system_conf/callback_urls](https://docs.pawapay.io/dashboard/other/system_conf/callback_urls)

Renseignez les 3 URLs suivantes (remplacer le domaine par le vôtre) :

| Type | URL |
|------|-----|
| Deposit | `https://big-five-bootcamp.vercel.app/api/payment/pawapay/callback/deposit` |
| Payout | `https://big-five-bootcamp.vercel.app/api/payment/pawapay/callback/payout` |
| Refund | `https://big-five-bootcamp.vercel.app/api/payment/pawapay/callback/refund` |

> En local, exposez votre serveur avec `ngrok http 3000` et utilisez l'URL ngrok
> dans le Dashboard (environnement sandbox).

## IPs à whitelister

Si vous activez `PAWAPAY_VERIFY_IP=true`, whitelister ces IPs au niveau réseau :

**Sandbox**
- `3.64.89.224/32`

**Production**
- `18.192.208.15/32`
- `18.195.113.136/32`
- `3.72.212.107/32`
- `54.73.125.42/32`
- `54.155.38.214/32`
- `54.73.130.113/32`

## Migration DB

Exécuter `scripts/add-pawapay-tables.sql` dans Supabase SQL Editor.

Ajoute :
- Colonnes `provider`, `provider_transaction_id`, `failure_code`,
  `failure_message`, `authorization_url`, `refunded_at`, `currency` sur `payments`
- Table `payouts` (envois vers clients)
- Table `refunds` (remboursements)
- Table `pawapay_orphan_callbacks` (callbacks reçus sans paiement associé)

## Utilisation — Initier un paiement

```ts
// Côté client (paywall, page subscribe, etc.)
const res = await fetch('/api/payment/pawapay/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 5000,
    currency: 'XOF',
    phoneNumber: '2250707123456',   // MSISDN complet
    provider: 'ORANGE_CIV',         // ou 'WAVE_CIV', 'MTN_MOMO_CIV'...
    customerMessage: 'Abo Premium', // max 22 chars
    userEmail: user.email,
    metadata: {
      type: 'subscription',
      userId: user.id,
      subscription_end_date: new Date(Date.now() + 30 * 864e5).toISOString(),
    },
  }),
})

const { depositId, status, nextStep, authorizationUrl } = await res.json()

if (nextStep === 'REDIRECT_TO_AUTH_URL' && authorizationUrl) {
  // Wave Senegal/CIV — rediriger le client
  window.location.href = authorizationUrl
} else {
  // Flow PIN prompt — afficher un écran "Tapez votre code PIN..."
}
```

Le callback `deposit` activera automatiquement l'abonnement si
`metadata.type === 'subscription'` (voir `activateUserSubscription`).

## Points clés d'implémentation (doc officielle)

- ✅ **Idempotence** : les callbacks peuvent être reçus plusieurs fois. On vérifie
  le statut actuel du paiement avant toute écriture ; si déjà final, on ignore.
- ✅ **HTTP 200** toujours : PawaPay retry pendant 15 min sur autre chose qu'un 200.
  Même sur erreur de parsing on renvoie 200 (le log reste en console).
- ✅ **Pas d'auth applicative** : les routes `/callback/*` ne sont pas protégées.
  Vérification optionnelle par IP via `PAWAPAY_VERIFY_IP`.
- ✅ **Callbacks orphelins** : si un callback arrive sans paiement associé (ex.
  paiement initié depuis un autre système), il est stocké dans `pawapay_orphan_callbacks`.
- ✅ **Polling de secours** : `GET /api/payment/pawapay/status/deposit/:id`
  pour vérifier manuellement le statut (job de réconciliation recommandé).
- ✅ **Resend callback** : `POST /v2/deposits/resend-callback/:id` côté PawaPay
  (exposé via `resendDepositCallback()` dans `lib/pawapay.ts`).

## Test en local avec ngrok

```bash
# Terminal 1 — Next.js
pnpm dev

# Terminal 2 — ngrok
ngrok http 3000

# → Copier l'URL HTTPS (ex: https://abc123.ngrok-free.app)
# → Dans le Dashboard PawaPay (sandbox), configurer :
#    Deposit callback : https://abc123.ngrok-free.app/api/payment/pawapay/callback/deposit
#    ...
```

Tester un deposit sandbox :

```bash
curl -X POST http://localhost:3000/api/payment/pawapay/deposit \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 100,
    "currency": "RWF",
    "phoneNumber": "250783456789",
    "provider": "MTN_MOMO_RWA"
  }'
```

En sandbox, le callback arrive automatiquement (pas d'écran PIN à valider).

## Job de réconciliation (recommandé)

Pour les paiements bloqués en `pending`/`processing` depuis > 15 minutes,
implémenter un cron qui appelle `checkDepositStatus(depositId)` et met à jour
le statut en base. Voir l'exemple de pseudocode dans la
[doc PawaPay — Ensuring consistency](https://docs.pawapay.io/v2/docs/deposits#ensuring-consistency).
