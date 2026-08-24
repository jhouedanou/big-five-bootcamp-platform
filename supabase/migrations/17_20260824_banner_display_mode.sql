-- =============================================================================
-- Bannières du dashboard : mode d'affichage
--
-- Table : dashboard_banners (migration #13)
--
-- La recette du 18/08 remonte que le visuel d'une bannière téléversée n'est pas
-- lisible : le carrousel traite `image_url` comme un décor de fond, cadré sur
-- la moitié droite de la carte et lavé par un dégradé. C'est le bon rendu pour
-- une bannière éditoriale (titre + texte + CTA écrits dans le formulaire), mais
-- pas pour un visuel de graphiste qui porte déjà toute sa mise en page.
--
-- `display_mode` sépare les deux cas :
--   'editorial' — rendu historique, texte du formulaire + visuel d'accompagnement
--   'image'     — le visuel occupe toute la carte, sans dégradé ni surimpression
--
-- Défaut 'editorial' : les bannières existantes gardent leur rendu actuel.
--
-- Autonome : ne dépend que de l'existence de la table #13.
-- =============================================================================

alter table public.dashboard_banners
  add column if not exists display_mode text not null default 'editorial';

alter table public.dashboard_banners
  drop constraint if exists dashboard_banners_display_mode_check;

alter table public.dashboard_banners
  add constraint dashboard_banners_display_mode_check
  check (display_mode in ('editorial', 'image'));

comment on column public.dashboard_banners.display_mode is
  'editorial = texte du formulaire + visuel d''accompagnement ; image = visuel plein cadre, sans texte superposé (le visuel porte sa propre mise en page).';

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select title, display_mode from public.dashboard_banners;
--   -- doit refuser une valeur hors liste :
--   update public.dashboard_banners set display_mode = 'plein-ecran';  -- ÉCHEC attendu
-- -----------------------------------------------------------------------------
