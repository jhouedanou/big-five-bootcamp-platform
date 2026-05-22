# Setup `support@laveiye.com` avec Resend Receiving

Objectif : tous les emails recus a `support@laveiye.com`, y compris les
notifications internes de brand requests, sont traites par Resend Inbound puis
forwardes vers l'adresse configuree dans l'admin, par defaut
`cossi@bigfiveabidjan.com`.

## Etat DNS verifie le 22 mai 2026

DNS autoritatif : Cloudflare (`nero.ns.cloudflare.com`,
`carlane.ns.cloudflare.com`).

Enregistrements publics actuels :

```txt
MX  laveiye.com  route3.mx.cloudflare.net  priority 51
MX  laveiye.com  route2.mx.cloudflare.net  priority 65
MX  laveiye.com  route1.mx.cloudflare.net  priority 99
TXT laveiye.com  "v=spf1 include:_spf.resend.com ~all"
TXT resend._domainkey.laveiye.com  DKIM present
TXT _dmarc.laveiye.com  "v=DMARC1; p=none; rua=mailto:contacts@bigfiveabidjan.com"
```

Conclusion : aujourd'hui, la reception de `support@laveiye.com` passe encore
par Cloudflare Email Routing. Pour que Resend recoive les emails, il faut
activer Receiving dans Resend puis ajouter l'enregistrement MX fourni par
Resend dans Cloudflare.

## Code deja pret

Le webhook Next.js est disponible ici :

```txt
POST https://laveiye.com/api/resend/inbound
```

Il fait 4 choses :

1. verifie la signature webhook Resend avec `RESEND_WEBHOOK_SECRET`;
2. accepte uniquement l'evenement `email.received`;
3. filtre par destinataire, par defaut `support@laveiye.com`;
4. forwarde l'email recu vers l'adresse configuree dans l'admin via
   `resend.emails.receiving.forward()`.

## Variables d'environnement

A configurer en production :

```bash
RESEND_API_KEY="re_xxxxxxxxx"
RESEND_WEBHOOK_SECRET="whsec_xxxxxxxxx"

# Optionnels, les valeurs ci-dessous sont deja les defaults du code.
RESEND_INBOUND_ALLOWED_RECIPIENTS="support@laveiye.com"
RESEND_INBOUND_FORWARD_TO="cossi@bigfiveabidjan.com"
RESEND_INBOUND_FORWARD_FROM="Laveiye Support <support@laveiye.com>"

# Emails sortants de l'app
CONTACT_FROM_EMAIL="Laveiye <noreply@laveiye.com>"
CONTACT_TO_EMAIL="support@laveiye.com"
SUPPORT_EMAIL="support@laveiye.com"
```

## Etapes Resend

1. Resend Dashboard -> Domains -> `laveiye.com`.
2. Activer le toggle **Receiving**.
3. Copier le MX record affiche par Resend.
4. Resend Dashboard -> Webhooks -> Add Webhook.
5. Endpoint URL :

```txt
https://laveiye.com/api/resend/inbound
```

6. Event a selectionner : `email.received`.
7. Copier le webhook secret dans `RESEND_WEBHOOK_SECRET`.

## Etapes Cloudflare DNS

Dans Cloudflare -> `laveiye.com` -> DNS :

1. Ajouter le MX fourni par Resend, generalement :

```txt
Type: MX
Name: @
Mail server: inbound-smtp.us-east-1.amazonaws.com
Priority: 10
Proxy: DNS only
```

2. Garder DKIM Resend :

```txt
Type: TXT
Name: resend._domainkey
Content: p=...
Proxy: DNS only
```

3. Garder SPF actuel :

```txt
TXT @ "v=spf1 include:_spf.resend.com ~all"
```

4. Garder DMARC, idealement changer le rapport vers Cossi si souhaite :

```txt
TXT _dmarc "v=DMARC1; p=none; rua=mailto:cossi@bigfiveabidjan.com"
```

Important : les MX Cloudflare existants ont actuellement des priorites 51, 65
et 99. Si le MX Resend est ajoute avec priority 10, Resend sera prioritaire et
recevra les emails du domaine. Si vous gardez Cloudflare en fallback, le
comportement attendu est Resend d'abord, Cloudflare seulement si le MX Resend
est indisponible.

## Brand requests

Les demandes de brand requests envoient deja une notification interne a
`SUPPORT_EMAIL`, par defaut `support@laveiye.com`, dans
`lib/notifications.ts`. Une fois Resend Receiving actif, ces emails seront donc
recus par Resend puis forwardes a `cossi@bigfiveabidjan.com`.

L'adresse finale du forward est modifiable sans redeploiement dans :

```txt
Admin -> Parametres -> Emails de contact -> Email de reception du forward Resend
```

Le reglage est stocke dans Supabase `site_settings` avec la cle
`resend_inbound_forward_to`. Si la cle est vide ou indisponible, le webhook
retombe sur `RESEND_INBOUND_FORWARD_TO`, puis sur `cossi@bigfiveabidjan.com`.

## Tests

1. Verifier le webhook :

```bash
curl https://laveiye.com/api/resend/inbound
```

Reponse attendue : JSON `ok: true`.

2. Envoyer un email depuis Gmail/Outlook vers :

```txt
support@laveiye.com
```

3. Confirmer dans Resend :

- event `email.received` visible;
- webhook delivery en succes;
- email forwarde a l'adresse configuree dans l'admin.

4. Tester une brand request depuis l'app et verifier que le mail interne arrive
chez Cossi.
