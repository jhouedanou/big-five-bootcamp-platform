# Mailchimp — à faire (5 min)

Dans Mailchimp : **Audience → Settings → Audience fields**.
Crée ces 7 cases. Pour **toutes**, choisis le type **"Text"**.

- **FNAME** → Prénom
- **LNAME** → Nom
- **COMPANY** → Entreprise
- **JOBTITLE** → Poste
- **TOPICS** → Sujets d'intérêt
- **PHONE** → Téléphone *(choisis bien "Text", PAS "Phone", sinon les numéros +225 sont refusés)*
- **SESSION** → Session du mois (ex : 2026-05)
- **PLAN** → Offre (Non abonné, Découverte, Basic, Pro)
- **SUBSTATUS** → Statut abonnement (active, expired, none…)

**Pourquoi :** sans ces cases, les infos des inscrits (surtout le téléphone) ne se rangent nulle part.

## Alerte hebdomadaire

L'alerte du lundi part désormais en **campagne Mailchimp unique**, plus en e-mail
par utilisateur. Le cron `/api/cron/weekly-email` s'en charge : il crée les champs
`PLAN` et `SUBSTATUS` s'ils manquent, synchronise l'audience, puis envoie au segment
enregistré **« Laveiye — alertes hebdo »** (`SUBSTATUS = active` et `PLAN ≠ Non abonné`).

Deux conséquences pour l'équipe :

- **Le désabonnement est géré par Mailchimp.** La colonne `email_unsubscribed` de
  Laveiye n'en est plus que le miroir : un désabonnement fait côté Laveiye est
  répercuté dans Mailchimp à la synchronisation suivante, jamais l'inverse.
- **L'expéditeur doit être renseigné** dans Paramètres → Mailchimp (nom et e-mail
  d'envoi) : sans lui, Mailchimp refuse de créer la campagne.

Répétition sans envoi : ajouter `?dryRun=1` à l'appel du cron — la campagne est
créée en brouillon dans Mailchimp, prête à être relue.
