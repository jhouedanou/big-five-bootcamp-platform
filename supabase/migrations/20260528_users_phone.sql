-- Ajoute le téléphone (avec indicatif pays) aux profils utilisateurs.
--
-- - `phone_country` : code interne du pays (ISO Alpha-3) sélectionné lors de
--   l'inscription (ex: 'CIV', 'SEN', 'FRA'). Sert au pré-remplissage du
--   sélecteur PawaPay côté paiement.
-- - `phone_e164`    : numéro complet en format E.164 (avec '+'). Validation
--   souple côté DB ; la stricte se fait côté API (cf. /api/auth/register).
--
-- Run in Supabase SQL Editor.

alter table users
  add column if not exists phone_country text,
  add column if not exists phone_e164 text;

-- Contrainte format E.164 : '+' suivi de 6 à 15 chiffres.
-- On utilise un check léger (l'API valide finement la longueur par pays).
alter table users
  drop constraint if exists users_phone_e164_format;
alter table users
  add constraint users_phone_e164_format
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{5,14}$');

-- Index pour retrouver un user par téléphone (lookups, anti-doublon).
create index if not exists idx_users_phone_e164
  on users (phone_e164)
  where phone_e164 is not null;
