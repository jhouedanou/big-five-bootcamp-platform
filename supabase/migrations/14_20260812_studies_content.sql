-- =============================================================================
-- Contenu éditorial des études, éditable depuis /admin/etudes
--
-- Jusqu'ici le texte de la landing vivait dans lib/studies.ts : changer un
-- bénéfice ou une question de FAQ demandait un déploiement. Le brief bannière
-- exige l'inverse — « textes, visuels, liens et paramètres modifiables dans
-- l'administration sans intervention technique pour chaque nouvelle étude ».
--
-- Les colonnes restent nullables : une étude sans contenu en base retombe sur
-- les valeurs par défaut de lib/studies.ts. Rien ne casse avant l'exécution.
--
-- Autonome : dépend uniquement de la table `studies` (migration 12).
-- =============================================================================

alter table public.studies add column if not exists eyebrow          text;
alter table public.studies add column if not exists description      text;
alter table public.studies add column if not exists cta_label        text;
alter table public.studies add column if not exists cover_url        text;
alter table public.studies add column if not exists benefits_title   text;
alter table public.studies add column if not exists final_cta_text   text;
alter table public.studies add column if not exists meta_description text;

-- Listes ordonnées : jsonb plutôt que des tables filles, car ce contenu est
-- toujours lu en bloc avec l'étude et jamais requêté ni joint séparément.
--   slides   : [{ "src": "...", "alt": "..." }]
--   benefits : ["...", "..."]
--   faq      : [{ "question": "...", "answer": "..." }]
alter table public.studies add column if not exists slides   jsonb;
alter table public.studies add column if not exists benefits jsonb;
alter table public.studies add column if not exists faq      jsonb;

-- Garde-fous : ces colonnes alimentent directement le rendu de la page, une
-- valeur scalaire au lieu d'un tableau planterait l'affichage.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'studies_slides_is_array') then
    alter table public.studies add constraint studies_slides_is_array
      check (slides is null or jsonb_typeof(slides) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'studies_benefits_is_array') then
    alter table public.studies add constraint studies_benefits_is_array
      check (benefits is null or jsonb_typeof(benefits) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'studies_faq_is_array') then
    alter table public.studies add constraint studies_faq_is_array
      check (faq is null or jsonb_typeof(faq) = 'array');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Seed du contenu actuel du Tome 1 — Finance, repris à l'identique de
-- lib/studies.ts pour que la bascule vers l'édition en base soit invisible.
-- N'écrase rien si le contenu a déjà été saisi depuis l'admin.
-- -----------------------------------------------------------------------------
update public.studies set
  eyebrow = coalesce(eyebrow, 'Étude'),
  description = coalesce(description, 'Accédez au guide pour découvrir une lecture stratégique des tendances créatives, des axes de communication et des contenus utilisés par les marques du secteur de la finance sur le digital.'),
  cta_label = coalesce(cta_label, 'Télécharger l’étude'),
  cover_url = coalesce(cover_url, '/etudes/finance/couverture.webp'),
  benefits_title = coalesce(benefits_title, 'Avec ce guide, vous allez pouvoir :'),
  final_cta_text = coalesce(final_cta_text, 'Découvrez les tendances, les axes de communication et les contenus qui structurent la communication digitale des marques financières.'),
  meta_description = coalesce(meta_description, 'Étude Big Five × Laveiye — Tome 1 : Finance. Tendances créatives, axes de communication et contenus des marques financières en Afrique francophone. Téléchargement gratuit.'),
  slides = coalesce(slides, '[
    {"src": "/etudes/finance/couverture.webp",  "alt": "Couverture de l’étude"},
    {"src": "/etudes/finance/preambule.webp",   "alt": "Page Préambule de l’étude"},
    {"src": "/etudes/finance/sommaire.webp",    "alt": "Page Sommaire du guide"},
    {"src": "/etudes/finance/contenu-uba.webp", "alt": "Page d’analyse Contenu 4 — UBA"}
  ]'::jsonb),
  benefits = coalesce(benefits, '[
    "Identifier les angles de communication qui reviennent le plus dans le secteur financier.",
    "Repérer des idées exploitables pour vos prochaines campagnes.",
    "Gagner du temps dans votre veille et vos benchmarks.",
    "Détecter les opportunités encore peu exploitées par vos concurrents.",
    "Améliorer vos briefs créatifs et vos recommandations marketing."
  ]'::jsonb),
  faq = coalesce(faq, '[
    {"question": "Pourquoi dois-je fournir les informations demandées ?",
     "answer": "Ces informations permettent de vous transmettre l’étude."},
    {"question": "Ce contenu est-il vraiment gratuit ?",
     "answer": "Oui. L’étude est mise à disposition gratuitement après validation du formulaire. Aucun paiement n’est demandé."}
  ]'::jsonb)
where slug = 'finance';

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select slug, jsonb_array_length(benefits) as nb_benefices,
--          jsonb_array_length(faq) as nb_faq, jsonb_array_length(slides) as nb_pages
--   from public.studies where slug = 'finance';        -- 5 / 2 / 4
-- -----------------------------------------------------------------------------
