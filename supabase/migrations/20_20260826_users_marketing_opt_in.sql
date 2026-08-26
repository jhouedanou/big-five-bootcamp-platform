-- Migration 20 — consentement marketing des comptes
--
-- Le brief tracking §6 classe `contact_opt_in_updated` en P0, avec les
-- paramètres `channel`, `status` et `source_context`. Jusqu'ici, le seul point
-- de consentement du produit était la case de la modale de la landing d'étude :
-- l'événement ne pouvait donc jamais partir depuis l'application, et le §9
-- (« déclencher WhatsApp uniquement avec un opt-in traçable ») restait sans
-- support côté comptes.
--
-- Deux colonnes plutôt qu'une : la date sépare « n'a jamais répondu » de
-- « a refusé », distinction que le brief exige puisqu'il attend un `status`.

alter table public.users
  add column if not exists marketing_opt_in boolean;

alter table public.users
  add column if not exists marketing_opt_in_at timestamptz;

comment on column public.users.marketing_opt_in is
  'Consentement aux communications marketing. NULL = jamais répondu, distinct de false (refus explicite).';

comment on column public.users.marketing_opt_in_at is
  'Horodatage du dernier choix, quel qu''il soit. Preuve de recueil du consentement.';

-- Segments « opt-in valide » du §9 : la lecture se fait toujours par ce filtre.
create index if not exists users_marketing_opt_in_idx
  on public.users (marketing_opt_in)
  where marketing_opt_in is true;
