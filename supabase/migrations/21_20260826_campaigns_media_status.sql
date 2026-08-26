-- Migration 21 — état d'hébergement des visuels de campagne
--
-- Le brief « Sécurisation des médias » (§7, §8.2) demande de classer chaque
-- média en sécurisé / à sécuriser / inaccessible, de compter par état, et de
-- filtrer dessus dans l'Éditeur en masse. Ces états ne peuvent pas être calculés
-- à l'affichage : établir le verdict impose une requête réseau par visuel, et le
-- balayage complet des 833 campagnes prend environ 90 secondes. Ils sont donc
-- calculés par l'audit et le cron, puis lus depuis ces colonnes.
--
-- `media_source_url` conserve l'URL d'origine au moment de la migration. Sans
-- elle, re-héberger un visuel écrase définitivement la trace de sa provenance :
-- plus aucun moyen de rejouer, de vérifier, ni de revenir en arrière.

alter table public.campaigns
  add column if not exists media_status text;

alter table public.campaigns
  add column if not exists media_checked_at timestamptz;

alter table public.campaigns
  add column if not exists media_reason text;

alter table public.campaigns
  add column if not exists media_source_url text;

comment on column public.campaigns.media_status is
  'État du visuel : secured (hébergé par LAVEIYE), external (URL tierce encore servie), broken (injoignable ou réponse non-image), empty (aucun visuel). NULL = jamais audité.';

comment on column public.campaigns.media_checked_at is
  'Date du dernier contrôle réseau du visuel. NULL = jamais contrôlé.';

comment on column public.campaigns.media_reason is
  'Motif lisible du dernier échec, affiché tel quel dans la liste d''exceptions de l''Éditeur en masse.';

comment on column public.campaigns.media_source_url is
  'URL du visuel avant migration vers le stockage LAVEIYE. Rend toute migration réversible et traçable.';

-- Contrainte souple : on refuse une valeur inventée, mais NULL reste permis
-- pour les campagnes pas encore auditées.
alter table public.campaigns
  drop constraint if exists campaigns_media_status_check;

alter table public.campaigns
  add constraint campaigns_media_status_check
  check (media_status is null or media_status in ('secured', 'external', 'broken', 'empty'));

-- Les compteurs et le filtre de l'Éditeur en masse lisent par cet index.
create index if not exists campaigns_media_status_idx
  on public.campaigns (media_status);

-- Amorçage sans réseau : ce que la seule forme de l'URL permet déjà de trancher.
-- Le premier audit affinera « external » en « external » ou « broken ».
update public.campaigns
set media_status = case
  when thumbnail is null or trim(thumbnail) = '' then 'empty'
  when thumbnail like '%.supabase.co/storage/%' then 'secured'
  else 'external'
end
where media_status is null;
