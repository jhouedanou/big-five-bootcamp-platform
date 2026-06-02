# Intégration FeexPay

Collecte Mobile Money via [FeexPay](https://docs.feexpay.me/?section=api-rest-integrations).
Remplace l'ancienne intégration PawaPay (collecte uniquement — FeexPay n'expose
pas de payout / refund / solde de wallet).

## Variables d'environnement

```bash
FEEXPAY_SHOP_ID=                 # ID de la boutique FeexPay
FEEXPAY_API_TOKEN=               # token API (LIVE commence par "fp_")
FEEXPAY_MODE=SANDBOX             # SANDBOX | LIVE
NEXT_PUBLIC_APP_URL=https://laveiye.com
```

## API utilisée

Base : `https://api.feexpay.me/api`. Auth : `Authorization: Bearer <FEEXPAY_API_TOKEN>`.

| Opération | Méthode | Endpoint |
|---|---|---|
| Initier collecte | POST | `/transactions/requesttopay/integration` |
| Vérifier statut | GET | `/transactions/getrequesttopay/integration/{reference}` |

Corps d'initiation (cf. `lib/feexpay.ts` → `initiateDeposit`) : `phoneNumber`,
`amount`, `reseau`, `description`, `customId` (= notre `ref_command`), `shop`,
`token`, `callback_info`, `currency`, `first_name`, `email`.

Réponse init : `{ reference, transaction_id }`. La `reference` est la clé de
polling — on la stocke dans `payments.metadata.feexpay_reference`.

Statuts FeexPay : `SUCCESSFUL` | `PENDING` | `FAILED`.

## Opérateurs (`lib/feexpay-providers.ts`)

Code interne stable (ex. `ORANGE_CIV`) → chaîne `reseau` FeexPay via `toReseau()`.
Pays supportés : CI (MTN/Moov/Orange/**Wave**), SN (Orange/Free), BF (Moov/Orange),
BJ (MTN/Moov/Celtiis), TG (TogoCom/Moov), CG (MTN). Wave CI est supporté par
FeexPay (contrairement à PawaPay).

## Flow

1. Le client choisit opérateur + numéro (front : `payment-button.tsx`,
   `subscribe/page.tsx`, `payment-form.tsx`).
2. Route serveur (`/api/payment/subscribe`, `/request`, `/brand-request/*`)
   insère le `payment` (status `pending`), appelle `initiateDeposit`, stocke la
   `reference` dans `metadata.feexpay_reference`.
3. Le client confirme par code PIN sur son téléphone. La page `/payment/pending`
   polle `/api/payment/check/[ref_command]`.
4. FeexPay POST le webhook → `/api/payment/feexpay/callback/deposit`.

## Sécurité

Le webhook FeexPay n'est pas signé et sa forme n'est pas garantie. On ne fait
**jamais** confiance au `status` du corps : on retrouve la transaction
(via `callback_info.ref_command` ou `reference`) puis on **re-vérifie** le statut
réel via `checkDepositStatus(reference)` (API authentifiée) avant tout effet de
bord. Même modèle pour le polling `/api/payment/check`.

## Webhook à déclarer

Dans le dashboard FeexPay, configurer l'URL de notification :

```
{NEXT_PUBLIC_APP_URL}/api/payment/feexpay/callback/deposit
```

## Fichiers clés

- `lib/feexpay.ts` — client API
- `lib/feexpay-providers.ts` — opérateurs + mapping `reseau`
- `app/api/payment/feexpay/deposit/route.ts` — init générique
- `app/api/payment/feexpay/status/[id]/route.ts` — polling
- `app/api/payment/feexpay/callback/deposit/route.ts` — webhook + activation
- `app/api/payment/check/[ref_command]/route.ts` — polling + activation (fallback)
