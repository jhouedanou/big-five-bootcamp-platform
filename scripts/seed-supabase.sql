-- ==============================================
-- Big Five Creative Library Platform - SEED DATA
-- À exécuter dans le SQL Editor de Supabase
-- Date: Février 2026
-- ==============================================

-- ⚠️ NOTE: La table public.users référence auth.users.
-- Les utilisateurs doivent d'abord être créés via Supabase Auth (Dashboard > Authentication > Users)
-- ou via l'API Auth. Ce script insère dans public.users en supposant que les auth.users existent déjà.

-- ==============================================
-- PARTIE 1: Creative LibraryS
-- ==============================================

-- Creative Library 1: Social Media Management Avancé (déjà dans schema, on fait un UPSERT)
INSERT INTO Creative Librarys (
  slug, title, tagline, description, level, duration, price,
  target_audience, prerequisites, objectives, program, methodology, trainer, faq
) VALUES (
  'social-media-management-avance',
  'Social Media Management Avancé',
  'Passez de gestionnaire à stratège des réseaux sociaux',
  'Maîtrisez les stratégies avancées de gestion des réseaux sociaux, de la planification stratégique à l''analyse de performance. Ce Creative Library intensif vous transformera en expert capable de piloter une stratégie social media complète et mesurable.',
  'Avancé',
  '2 jours (14 heures)',
  450000,
  ARRAY['Social Media Managers expérimentés', 'Community Managers seniors', 'Responsables communication digitale', 'Consultants en marketing digital'],
  ARRAY['1 an d''expérience en gestion de réseaux sociaux', 'Maîtrise des plateformes principales (Facebook, Instagram, LinkedIn)', 'Connaissance des bases du marketing digital'],
  ARRAY[
    'Élaborer une stratégie social media alignée sur les objectifs business',
    'Maîtriser les techniques avancées de community management',
    'Analyser et optimiser les performances avec des KPIs pertinents',
    'Gérer des crises sur les réseaux sociaux',
    'Piloter des campagnes publicitaires social media ROI-positives'
  ],
  '{
    "day1": {
      "title": "Jour 1 : Stratégie et Planification Avancée",
      "modules": [
        {"title": "Audit stratégique social media", "duration": "2h", "topics": ["Analyse concurrentielle approfondie", "Identification des opportunités", "Benchmark des best practices"]},
        {"title": "Framework stratégique", "duration": "2h", "topics": ["Définition des objectifs SMART", "Personas et segmentation avancée", "Mapping du parcours client social"]},
        {"title": "Planification éditoriale avancée", "duration": "3h", "topics": ["Calendrier éditorial stratégique", "Formats de contenu innovants", "Automatisation intelligente", "Atelier pratique"]}
      ]
    },
    "day2": {
      "title": "Jour 2 : Analytics, Reporting et Optimisation",
      "modules": [
        {"title": "Analytics avancés", "duration": "2h", "topics": ["Mise en place de KPIs pertinents", "Attribution multi-touch", "Google Analytics 4 pour social media"]},
        {"title": "Social Media Advertising", "duration": "2h", "topics": ["Stratégies de ciblage avancées", "Optimisation des campagnes", "A/B testing et itération"]},
        {"title": "Reporting et gestion de crise", "duration": "3h", "topics": ["Création de dashboards exécutifs", "Storytelling avec la data", "Protocole de gestion de crise", "Cas pratiques réels"]}
      ]
    }
  }'::jsonb,
  'Notre approche privilégie la pratique (70%) sur la théorie (30%). Chaque module alterne entre présentation de concepts, démonstrations live et exercices pratiques sur des cas réels. Vous repartirez avec des templates, checklists et frameworks directement applicables.',
  '{"name": "Sarah Koné", "title": "Stratège Social Media Senior", "bio": "12 ans d''expérience en marketing digital, Sarah a piloté les stratégies social media de grandes marques panafricaines. Certifiée Meta Blueprint et Google Digital Marketing, elle forme des professionnels depuis 5 ans.", "expertise": ["Stratégie social media", "Community management", "Social media advertising", "Analytics et reporting"], "image": "/images/trainers/sarah-kone.jpg"}'::jsonb,
  '[
    {"question": "Quel niveau est requis pour ce Creative Library ?", "answer": "Ce Creative Library s''adresse à des professionnels ayant au minimum 1 an d''expérience en gestion de réseaux sociaux."},
    {"question": "Recevrai-je un certificat ?", "answer": "Oui, un certificat de participation Big Five vous sera délivré à l''issue du Creative Library."},
    {"question": "Le matériel est-il fourni ?", "answer": "Vous devez venir avec votre ordinateur portable. Nous fournissons tous les supports de formation."},
    {"question": "Puis-je payer en plusieurs fois ?", "answer": "Oui, nous proposons un paiement en 2 fois sans frais pour les particuliers."}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Creative Library 2: Content Marketing & Storytelling
INSERT INTO Creative Librarys (
  slug, title, tagline, description, level, duration, price,
  target_audience, prerequisites, objectives, program, methodology, trainer, faq
) VALUES (
  'content-marketing-storytelling',
  'Content Marketing & Storytelling',
  'Créez du contenu qui captive et convertit',
  'Apprenez à créer une stratégie de contenu percutante et à maîtriser l''art du storytelling pour engager votre audience. De la rédaction web au brand content, ce Creative Library vous donne toutes les clés pour produire du contenu qui performe.',
  'Intermédiaire',
  '2 jours (14 heures)',
  350000,
  ARRAY['Responsables marketing', 'Content managers', 'Rédacteurs web', 'Chargés de communication', 'Entrepreneurs'],
  ARRAY['Connaissance de base du marketing digital', 'Expérience en rédaction de contenu', 'Maîtrise du français écrit'],
  ARRAY[
    'Définir une stratégie de contenu alignée sur les objectifs business',
    'Maîtriser les techniques de storytelling appliquées au marketing',
    'Créer des contenus engageants pour différents canaux',
    'Optimiser le contenu pour le SEO',
    'Mesurer la performance de sa stratégie de contenu'
  ],
  '{
    "day1": {
      "title": "Jour 1 : Stratégie de Contenu & Fondamentaux",
      "modules": [
        {"title": "Audit de contenu et benchmark", "duration": "2h", "topics": ["Analyse de l''existant", "Benchmark concurrentiel", "Identification des gaps"]},
        {"title": "Stratégie éditoriale", "duration": "2h", "topics": ["Définition de la ligne éditoriale", "Personas et parcours de contenu", "Calendrier éditorial"]},
        {"title": "Les bases du storytelling", "duration": "3h", "topics": ["Structure narrative", "Arcs émotionnels", "Storytelling de marque", "Atelier d''écriture"]}
      ]
    },
    "day2": {
      "title": "Jour 2 : Production & Optimisation",
      "modules": [
        {"title": "Rédaction web & SEO", "duration": "2h", "topics": ["Écrire pour le web", "Optimisation SEO on-page", "Mots-clés et intention de recherche"]},
        {"title": "Brand content & formats", "duration": "2h", "topics": ["Formats de contenu performants", "Vidéo, infographie, podcast", "User Generated Content"]},
        {"title": "Mesure et optimisation", "duration": "3h", "topics": ["KPIs de contenu", "Outils d''analyse", "A/B testing éditorial", "Projet final"]}
      ]
    }
  }'::jsonb,
  'Formation immersive combinant théorie et pratique. Les participants travaillent sur des cas réels et repartent avec un plan de contenu actionnable pour leur entreprise.',
  '{"name": "Aminata Diallo", "title": "Directrice de contenu", "bio": "10 ans d''expérience en content marketing, Aminata a dirigé les stratégies de contenu de marques comme Orange, Total et Nestlé en Afrique de l''Ouest. Passionnée de storytelling, elle forme les professionnels depuis 4 ans.", "expertise": ["Content marketing", "Storytelling", "SEO", "Brand content"], "image": "/images/trainers/aminata-diallo.jpg"}'::jsonb,
  '[
    {"question": "Faut-il savoir écrire pour participer ?", "answer": "Une aisance rédactionnelle est recommandée mais pas obligatoire. Le Creative Library inclut des exercices progressifs."},
    {"question": "Quels outils seront utilisés ?", "answer": "Nous utiliserons ChatGPT, Canva, Google Analytics, et des outils SEO comme Ubersuggest et SEMrush."},
    {"question": "Le Creative Library est-il adapté à mon secteur ?", "answer": "Oui, les principes enseignés sont universels et seront adaptés à votre secteur lors des ateliers pratiques."}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Creative Library 3: Publicité Digitale (Meta, Google, TikTok)
INSERT INTO Creative Librarys (
  slug, title, tagline, description, level, duration, price,
  target_audience, prerequisites, objectives, program, methodology, trainer, faq
) VALUES (
  'publicite-digitale-meta-google',
  'Publicité Digitale : Meta, Google & TikTok Ads',
  'Maîtrisez les plateformes publicitaires qui comptent',
  'Devenez autonome sur les principales plateformes publicitaires digitales. Ce Creative Library intensif vous apprend à créer, gérer et optimiser des campagnes publicitaires performantes sur Meta (Facebook & Instagram), Google Ads et TikTok Ads.',
  'Intermédiaire',
  '3 jours (21 heures)',
  600000,
  ARRAY['Digital marketers', 'Media planners', 'Growth hackers', 'Entrepreneurs', 'Responsables acquisition'],
  ARRAY['Connaissance de base du marketing digital', 'Compte publicitaire actif sur au moins une plateforme', 'Budget publicitaire disponible pour les exercices'],
  ARRAY[
    'Créer et structurer des campagnes sur Meta, Google et TikTok',
    'Maîtriser le ciblage et les audiences sur chaque plateforme',
    'Optimiser les performances et le ROAS',
    'Lire et interpréter les métriques publicitaires',
    'Scaler des campagnes rentables'
  ],
  '{
    "day1": {
      "title": "Jour 1 : Meta Ads (Facebook & Instagram)",
      "modules": [
        {"title": "Structure de campagne Meta", "duration": "2h", "topics": ["Business Manager", "Pixel et API Conversions", "Objectifs de campagne"]},
        {"title": "Ciblage et audiences", "duration": "2h", "topics": ["Audiences personnalisées", "Lookalike audiences", "Exclusions et optimisation"]},
        {"title": "Création publicitaire", "duration": "3h", "topics": ["Formats créatifs", "Copywriting publicitaire", "A/B testing créatif", "Atelier pratique"]}
      ]
    },
    "day2": {
      "title": "Jour 2 : Google Ads",
      "modules": [
        {"title": "Search Ads", "duration": "2.5h", "topics": ["Recherche de mots-clés", "Structure de campagne", "Rédaction d''annonces", "Extensions"]},
        {"title": "Display & YouTube Ads", "duration": "2h", "topics": ["Réseau Display", "Publicité YouTube", "Remarketing"]},
        {"title": "Performance Max & Shopping", "duration": "2.5h", "topics": ["Campagnes Performance Max", "Google Shopping", "Smart Bidding"]}
      ]
    },
    "day3": {
      "title": "Jour 3 : TikTok Ads & Optimisation Cross-Platform",
      "modules": [
        {"title": "TikTok Ads Manager", "duration": "2.5h", "topics": ["Structure de campagne TikTok", "Spark Ads", "Formats créatifs natifs"]},
        {"title": "Optimisation cross-platform", "duration": "2h", "topics": ["Attribution multi-touch", "Budget allocation", "Reporting unifié"]},
        {"title": "Scaling & automatisation", "duration": "2.5h", "topics": ["Stratégies de scaling", "Règles automatisées", "Projet final intégratif"]}
      ]
    }
  }'::jsonb,
  'Creative Library 100% pratique. Chaque participant travaille sur ses propres comptes publicitaires avec des budgets réels. Accompagnement personnalisé et feedback en temps réel.',
  '{"name": "Koffi Mensah", "title": "Expert en Acquisition Digitale", "bio": "8 ans d''expérience en publicité digitale, Koffi a géré plus de 2 milliards de FCFA de budgets publicitaires pour des clients en Afrique de l''Ouest et Centrale. Certifié Meta, Google et TikTok.", "expertise": ["Meta Ads", "Google Ads", "TikTok Ads", "Growth marketing", "Analytics"], "image": "/images/trainers/koffi-mensah.jpg"}'::jsonb,
  '[
    {"question": "Ai-je besoin d''un budget publicitaire ?", "answer": "Oui, un budget minimum de 50 000 FCFA est recommandé pour les exercices pratiques sur chaque plateforme."},
    {"question": "Les certifications sont-elles incluses ?", "answer": "Non, mais nous vous préparons aux certifications Meta Blueprint et Google Ads que vous pourrez passer après le Creative Library."},
    {"question": "Puis-je participer sans compte publicitaire ?", "answer": "Il est fortement recommandé d''avoir au moins un compte Business Manager Meta configuré avant le Creative Library."}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Creative Library 4: Branding & Identité Visuelle
INSERT INTO Creative Librarys (
  slug, title, tagline, description, level, duration, price,
  target_audience, prerequisites, objectives, program, methodology, trainer, faq
) VALUES (
  'branding-identite-visuelle',
  'Branding & Identité Visuelle',
  'Construisez une marque forte et mémorable',
  'De la définition de votre positionnement à la création d''une identité visuelle impactante, ce Creative Library vous guide pas à pas dans la construction d''une marque forte. Apprenez les méthodologies des grandes agences adaptées au marché africain.',
  'Intermédiaire',
  '2 jours (14 heures)',
  400000,
  ARRAY['Entrepreneurs', 'Directeurs marketing', 'Graphistes et designers', 'Chefs de marque', 'Consultants en communication'],
  ARRAY['Notion de base en marketing', 'Intérêt pour le design et la créativité', 'Projet de marque en cours ou à venir'],
  ARRAY[
    'Définir un positionnement de marque différenciant',
    'Créer une plateforme de marque complète',
    'Concevoir une identité visuelle cohérente',
    'Déployer la marque sur tous les points de contact',
    'Mesurer et gérer la perception de marque'
  ],
  '{
    "day1": {
      "title": "Jour 1 : Stratégie de Marque",
      "modules": [
        {"title": "Fondamentaux du branding", "duration": "2h", "topics": ["Qu''est-ce qu''une marque ?", "Brand equity", "Tendances branding en Afrique"]},
        {"title": "Plateforme de marque", "duration": "2h", "topics": ["Vision, mission, valeurs", "Personnalité de marque", "Tone of voice"]},
        {"title": "Positionnement et différenciation", "duration": "3h", "topics": ["Analyse concurrentielle", "Unique Selling Proposition", "Brand mapping", "Atelier positioning"]}
      ]
    },
    "day2": {
      "title": "Jour 2 : Identité Visuelle & Déploiement",
      "modules": [
        {"title": "Identité visuelle", "duration": "2.5h", "topics": ["Logo et logotype", "Palette de couleurs", "Typographie", "Iconographie"]},
        {"title": "Brand guidelines", "duration": "2h", "topics": ["Création d''une charte graphique", "Do''s and Don''ts", "Templates et déclinaisons"]},
        {"title": "Déploiement multi-canal", "duration": "2.5h", "topics": ["Digital branding", "Réseaux sociaux", "Print et packaging", "Présentation finale"]}
      ]
    }
  }'::jsonb,
  'Approche workshop : les participants travaillent sur leur propre projet de marque tout au long du Creative Library. Feedback personnalisé et peer review pour enrichir chaque projet.',
  '{"name": "Awa Touré", "title": "Directrice Artistique & Brand Strategist", "bio": "15 ans d''expérience en branding et direction artistique. Awa a créé l''identité de marques africaines emblématiques. Diplômée de l''ESAG Penninghen, elle combine vision créative et stratégie business.", "expertise": ["Brand strategy", "Identité visuelle", "Direction artistique", "Design thinking"], "image": "/images/trainers/awa-toure.jpg"}'::jsonb,
  '[
    {"question": "Faut-il savoir utiliser des logiciels de design ?", "answer": "Non, ce Creative Library se concentre sur la stratégie. Les concepts de design sont expliqués de manière accessible."},
    {"question": "Puis-je travailler sur ma propre marque ?", "answer": "Absolument ! C''est même encouragé. Vous repartirez avec un document de marque complet pour votre entreprise."},
    {"question": "Ce Creative Library est-il adapté aux startups ?", "answer": "Oui, la méthodologie est particulièrement adaptée aux startups et PME qui souhaitent structurer leur marque."}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Creative Library 5: Influence Marketing & Partenariats
INSERT INTO Creative Librarys (
  slug, title, tagline, description, level, duration, price,
  target_audience, prerequisites, objectives, program, methodology, trainer, faq
) VALUES (
  'influence-marketing-partenariats',
  'Influence Marketing & Partenariats Stratégiques',
  'Activez le pouvoir des créateurs de contenu africains',
  'Le marketing d''influence en Afrique connaît une croissance exponentielle. Ce Creative Library vous apprend à identifier, négocier et activer des partenariats avec des influenceurs et créateurs de contenu pour maximiser votre impact et votre ROI.',
  'Avancé',
  '1 jour (7 heures)',
  250000,
  ARRAY['Responsables marketing', 'Community managers', 'PR managers', 'Responsables partenariats', 'Agences de communication'],
  ARRAY['Connaissance des réseaux sociaux', 'Expérience en marketing digital', 'Budget influence disponible ou en projet'],
  ARRAY[
    'Cartographier l''écosystème des influenceurs en Afrique',
    'Définir une stratégie d''influence marketing efficace',
    'Identifier et évaluer les bons influenceurs',
    'Négocier et structurer des partenariats gagnant-gagnant',
    'Mesurer le ROI des campagnes d''influence'
  ],
  '{
    "day1": {
      "title": "Jour 1 : Influence Marketing de A à Z",
      "modules": [
        {"title": "L''écosystème de l''influence en Afrique", "duration": "1.5h", "topics": ["Panorama des influenceurs africains", "Tendances et spécificités locales", "Réglementation et éthique"]},
        {"title": "Stratégie d''influence", "duration": "2h", "topics": ["Objectifs et KPIs", "Types de collaborations", "Budget et planification"]},
        {"title": "Identification et évaluation", "duration": "1.5h", "topics": ["Outils de recherche d''influenceurs", "Analyse d''audience", "Détection de faux followers"]},
        {"title": "Activation et mesure", "duration": "2h", "topics": ["Brief créatif", "Négociation de contrats", "Suivi de campagne", "ROI et reporting"]}
      ]
    }
  }'::jsonb,
  'Formation intensive avec des études de cas réelles de campagnes d''influence en Afrique. Les participants analysent des campagnes, négocient des briefs fictifs et créent leur propre stratégie d''influence.',
  '{"name": "Fatou Ndiaye", "title": "Consultante en Influence Marketing", "bio": "Pionnière du marketing d''influence en Afrique de l''Ouest, Fatou a coordonné plus de 200 campagnes d''influence pour des marques internationales. Elle est aussi co-fondatrice d''une plateforme de mise en relation marques-influenceurs.", "expertise": ["Influence marketing", "Relations publiques", "Creator economy", "Brand partnerships"], "image": "/images/trainers/fatou-ndiaye.jpg"}'::jsonb,
  '[
    {"question": "Ce Creative Library est-il adapté aux petits budgets ?", "answer": "Oui, nous abordons les stratégies de micro-influence accessibles à tous les budgets."},
    {"question": "Vais-je rencontrer des influenceurs pendant le Creative Library ?", "answer": "Un panel d''influenceurs est prévu pour partager leur expérience et répondre à vos questions."}
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;


-- ==============================================
-- PARTIE 2: SESSIONS (pour chaque Creative Library)
-- ==============================================

-- Sessions pour Social Media Management Avancé
INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-03-15'::date, '2026-03-16'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Présentiel', 'Sarah Koné', 20, 18
FROM Creative Librarys b WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-04-20'::date, '2026-04-21'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Hybride', 'Sarah Koné', 25, 25
FROM Creative Librarys b WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-06-10'::date, '2026-06-11'::date, 'Hôtel Ivoire, Plateau', 'Abidjan', 'Présentiel', 'Sarah Koné', 30, 30
FROM Creative Librarys b WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

-- Sessions pour Content Marketing & Storytelling
INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-03-22'::date, '2026-03-23'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Présentiel', 'Aminata Diallo', 20, 16
FROM Creative Librarys b WHERE b.slug = 'content-marketing-storytelling'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-05-15'::date, '2026-05-16'::date, 'Radisson Blu, Plateau', 'Abidjan', 'Hybride', 'Aminata Diallo', 25, 25
FROM Creative Librarys b WHERE b.slug = 'content-marketing-storytelling'
ON CONFLICT DO NOTHING;

-- Sessions pour Publicité Digitale
INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-04-05'::date, '2026-04-07'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Présentiel', 'Koffi Mensah', 15, 12
FROM Creative Librarys b WHERE b.slug = 'publicite-digitale-meta-google'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-06-15'::date, '2026-06-17'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Hybride', 'Koffi Mensah', 20, 20
FROM Creative Librarys b WHERE b.slug = 'publicite-digitale-meta-google'
ON CONFLICT DO NOTHING;

-- Sessions pour Branding & Identité Visuelle
INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-04-18'::date, '2026-04-19'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Présentiel', 'Awa Touré', 20, 15
FROM Creative Librarys b WHERE b.slug = 'branding-identite-visuelle'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-07-05'::date, '2026-07-06'::date, 'Sofitel Hôtel Ivoire, Cocody', 'Abidjan', 'Présentiel', 'Awa Touré', 25, 25
FROM Creative Librarys b WHERE b.slug = 'branding-identite-visuelle'
ON CONFLICT DO NOTHING;

-- Sessions pour Influence Marketing
INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-03-29'::date, '2026-03-29'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Présentiel', 'Fatou Ndiaye', 25, 20
FROM Creative Librarys b WHERE b.slug = 'influence-marketing-partenariats'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (Creative Library_id, start_date, end_date, location, city, format, trainer_name, max_capacity, available_spots)
SELECT b.id, '2026-05-24'::date, '2026-05-24'::date, 'Big Five Campus, Cocody', 'Abidjan', 'Hybride', 'Fatou Ndiaye', 30, 30
FROM Creative Librarys b WHERE b.slug = 'influence-marketing-partenariats'
ON CONFLICT DO NOTHING;


-- ==============================================
-- PARTIE 3: CAMPAGNES (Content Marketing)
-- ==============================================

-- Note: author_id est NULL car les utilisateurs auth n'existent pas encore
-- Mettez à jour author_id une fois les utilisateurs créés

INSERT INTO campaigns (title, description, brand, category, thumbnail, images, video_url, platforms, duration, target_audience, tags, status, author_name)
VALUES
(
  'MTN Ghana - Mobile Money Campaign',
  'Campagne virale pour promouvoir les services de transfert d''argent mobile avec des influenceurs locaux. Focus sur la simplicité et la rapidité du service M-Money dans les zones rurales.',
  'MTN',
  'Telecoms',
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['Facebook', 'Instagram', 'YouTube'],
  '3 mois',
  'Jeunes adultes 18-35 ans, zones urbaines et péri-urbaines',
  ARRAY['Fintech', 'Humour', 'Viral', 'Mobile Money'],
  'Publié',
  'Sarah Koné'
),
(
  'Orange CI - Fête de la Musique',
  'Activation musicale avec des artistes locaux pour célébrer la fête de la musique et renforcer le lien avec la jeunesse ivoirienne.',
  'Orange',
  'Telecoms',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['Instagram', 'TikTok', 'Facebook'],
  '1 mois',
  'Jeunes 16-30 ans, fans de musique ivoirienne',
  ARRAY['Musique', 'Culture', 'Événement', 'Jeunesse'],
  'Publié',
  'Aminata Diallo'
),
(
  'Jumia Nigeria - Black Friday Madness',
  'Campagne 360° pour le Black Friday avec countdown, influenceurs et offres exclusives sur l''app. Objectif : augmenter les téléchargements de 200%.',
  'Jumia',
  'E-commerce',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=450&fit=crop', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['Facebook', 'Instagram', 'TikTok', 'Google'],
  '2 semaines',
  'Acheteurs en ligne 25-45 ans, classes moyennes et supérieures',
  ARRAY['Promo', 'FOMO', 'Saisonnier', 'E-commerce'],
  'Publié',
  'Koffi Mensah'
),
(
  'Wave Sénégal - Envoi d''argent simplifié',
  'Série de témoignages clients montrant la simplicité des transferts d''argent via Wave. Campagne émotionnelle centrée sur les histoires vraies.',
  'Wave',
  'Banque/Finance',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['Facebook', 'YouTube'],
  '2 mois',
  'Adultes 25-50 ans, utilisateurs de services financiers mobiles',
  ARRAY['Témoignage', 'Simplicité', 'Trust', 'Fintech'],
  'Publié',
  'Fatou Ndiaye'
),
(
  'Dangote Cement - Building Africa',
  'Campagne corporate mettant en avant la contribution de Dangote à la construction du continent. Focus RSE et développement durable.',
  'Dangote',
  'Industrie',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['LinkedIn', 'YouTube'],
  '6 mois',
  'Professionnels du BTP, investisseurs, leaders d''opinion',
  ARRAY['Corporate', 'RSE', 'Brand', 'Infrastructure'],
  'Publié',
  'Awa Touré'
),
(
  'Société Générale CI - Compte Jeune',
  'Lancement du compte bancaire jeune avec une campagne ciblée sur les étudiants et jeunes actifs. Approche gamifiée.',
  'Société Générale',
  'Banque/Finance',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['Instagram', 'TikTok', 'Snapchat'],
  '3 mois',
  'Étudiants et jeunes actifs 18-28 ans',
  ARRAY['Jeunesse', 'Lancement', 'Digital', 'Gamification'],
  'Publié',
  'Sarah Koné'
),
(
  'Coca-Cola Africa - Share a Coke',
  'Adaptation africaine de la campagne Share a Coke avec des prénoms locaux populaires dans 15 pays du continent.',
  'Coca-Cola',
  'FMCG',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=450&fit=crop', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['Facebook', 'Instagram', 'TikTok'],
  '4 mois',
  'Grand public, 15-45 ans, amateurs de boissons sucrées',
  ARRAY['Personnalisation', 'Viral', 'UGC', 'Pan-africain'],
  'Publié',
  'Aminata Diallo'
),
(
  'Safaricom Kenya - M-Pesa 20 ans',
  'Célébration des 20 ans de M-Pesa avec des stories émotionnelles sur l''impact du service sur la vie des Kenyans.',
  'Safaricom',
  'Telecoms',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['YouTube', 'Facebook', 'Twitter/X'],
  '2 mois',
  'Utilisateurs M-Pesa, grand public kenyan',
  ARRAY['Anniversaire', 'Storytelling', 'Émotion', 'Heritage'],
  'Publié',
  'Fatou Ndiaye'
),
(
  'Total Energies - Station Solaire',
  'Campagne RSE sur l''installation de stations solaires dans les zones rurales de Côte d''Ivoire. Impact environnemental et social.',
  'TotalEnergies',
  'Énergie',
  'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['LinkedIn', 'Facebook'],
  '3 mois',
  'Professionnels de l''énergie, ONG, décideurs politiques',
  ARRAY['RSE', 'Environnement', 'Innovation', 'Solaire'],
  'Publié',
  'Awa Touré'
),
(
  'Nescafé Afrique - Morning Routine',
  'Série de mini-documentaires sur les routines matinales de créateurs africains avec Nescafé. Partenariat avec 20 influenceurs.',
  'Nescafé',
  'FMCG',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['YouTube', 'Instagram'],
  '4 mois',
  'Jeunes professionnels 25-40 ans, consommateurs de café',
  ARRAY['Lifestyle', 'Storytelling', 'Influenceur', 'Morning'],
  'Publié',
  'Koffi Mensah'
),
(
  'Vodafone Ghana - 5G Launch',
  'Campagne de lancement de la 5G au Ghana avec des démonstrations technologiques impressionnantes et des use cases concrets.',
  'Vodafone',
  'Telecoms',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['YouTube', 'LinkedIn', 'Twitter/X'],
  '2 mois',
  'Early adopters tech, professionnels IT, entreprises',
  ARRAY['Tech', 'Innovation', 'Lancement', '5G'],
  'En attente',
  'Sarah Koné'
),
(
  'Guinness Nigeria - Made of Black',
  'Célébration de la culture africaine et de l''identité noire à travers des portraits artistiques et des collaborations avec des artistes locaux.',
  'Guinness',
  'FMCG',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['Instagram', 'YouTube', 'Facebook'],
  '6 mois',
  'Adultes 25-45 ans, amateurs de culture et d''art',
  ARRAY['Culture', 'Identité', 'Art', 'Célébration'],
  'Publié',
  'Awa Touré'
),
(
  'Ecobank - Digital Banking Revolution',
  'Tutoriels vidéo sur l''utilisation de l''app Ecobank pour les opérations bancaires quotidiennes. Campagne éducative multi-pays.',
  'Ecobank',
  'Banque/Finance',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['Facebook', 'YouTube', 'WhatsApp'],
  '3 mois',
  'Clients bancaires 30-55 ans, peu familiers avec le digital',
  ARRAY['Tutorial', 'Digital', 'Éducation', 'Banque'],
  'Publié',
  'Koffi Mensah'
),
(
  'Moov Africa - Forfait Illimité',
  'Lancement du forfait illimité avec une campagne teaser mystère suivie d''une révélation spectaculaire sur les réseaux sociaux.',
  'Moov Africa',
  'Telecoms',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=450&fit=crop'],
  NULL,
  ARRAY['Instagram', 'Facebook', 'TikTok'],
  '1 mois',
  'Jeunes 16-30 ans, gros consommateurs de data',
  ARRAY['Teaser', 'Lancement', 'Suspense', 'Data'],
  'Brouillon',
  'Aminata Diallo'
),
(
  'Glovo Maroc - Livraison Express',
  'Challenge TikTok montrant la rapidité de livraison Glovo avec des influenceurs locaux marocains. Plus de 2M de vues en 48h.',
  'Glovo',
  'E-commerce',
  'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=450&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=450&fit=crop'],
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ARRAY['TikTok', 'Instagram'],
  '2 semaines',
  'Jeunes urbains 18-35 ans, utilisateurs de delivery',
  ARRAY['Challenge', 'Influenceur', 'Humour', 'Delivery'],
  'Publié',
  'Fatou Ndiaye'
);


-- ==============================================
-- PARTIE 4: INSCRIPTIONS DE DÉMONSTRATION
-- ==============================================

-- Inscriptions pour la session Social Media Management (mars 2026)
INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'kouame.jean@email.com',
  'Jean',
  'Kouamé',
  '+225 07 08 09 10 11',
  'Digital Agency CI',
  'Social Media Manager',
  'LinkedIn',
  'Paid',
  'Card',
  450000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'social-media-management-avance' AND s.start_date = '2026-03-15'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'aminata.traore@email.com',
  'Aminata',
  'Traoré',
  '+225 01 02 03 04 05',
  'Orange Côte d''Ivoire',
  'Community Manager',
  'Bouche à oreille',
  'Paid',
  'Transfer',
  450000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'social-media-management-avance' AND s.start_date = '2026-03-15'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'ibrahim.diallo@email.com',
  'Ibrahim',
  'Diallo',
  '+225 05 06 07 08 09',
  'Freelance',
  'Consultant Digital',
  'Instagram',
  'Pending',
  'Card',
  450000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'social-media-management-avance' AND s.start_date = '2026-03-15'
LIMIT 1;

-- Inscriptions pour Content Marketing (mars 2026)
INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'marie.bamba@email.com',
  'Marie',
  'Bamba',
  '+225 07 11 22 33 44',
  'Nestlé CI',
  'Content Manager',
  'Site web',
  'Paid',
  'Quote',
  350000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'content-marketing-storytelling' AND s.start_date = '2026-03-22'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'paul.koffi@email.com',
  'Paul',
  'Koffi',
  '+225 01 55 66 77 88',
  'Startup Hub Abidjan',
  'Fondateur',
  'Facebook',
  'Paid',
  'Card',
  350000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'content-marketing-storytelling' AND s.start_date = '2026-03-22'
LIMIT 1;

-- Inscriptions pour Publicité Digitale (avril 2026)
INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'adama.sylla@email.com',
  'Adama',
  'Sylla',
  '+225 07 99 88 77 66',
  'E-commerce Plus',
  'Growth Manager',
  'Google',
  'Paid',
  'Card',
  600000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'publicite-digitale-meta-google' AND s.start_date = '2026-04-05'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'fatima.ouattara@email.com',
  'Fatima',
  'Ouattara',
  '+225 05 44 33 22 11',
  'Agence 360°',
  'Media Planner',
  'LinkedIn',
  'Pending',
  'Transfer',
  600000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'publicite-digitale-meta-google' AND s.start_date = '2026-04-05'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'yves.aka@email.com',
  'Yves',
  'Aka',
  '+225 01 23 45 67 89',
  'TechCorp Abidjan',
  'Digital Marketing Lead',
  'Newsletter',
  'Paid',
  'Card',
  600000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'publicite-digitale-meta-google' AND s.start_date = '2026-04-05'
LIMIT 1;

-- Inscriptions pour Branding (avril 2026)
INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'celine.gnago@email.com',
  'Céline',
  'Gnago',
  '+225 07 12 34 56 78',
  'Mode Afrique SARL',
  'Directrice Artistique',
  'Instagram',
  'Paid',
  'Card',
  400000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'branding-identite-visuelle' AND s.start_date = '2026-04-18'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'david.kouassi@email.com',
  'David',
  'Kouassi',
  '+225 05 98 76 54 32',
  'Kouassi & Partners',
  'Fondateur / CEO',
  'Recommandation',
  'Paid',
  'Transfer',
  400000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'branding-identite-visuelle' AND s.start_date = '2026-04-18'
LIMIT 1;

-- Inscriptions pour Influence Marketing (mars 2026)
INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'sandrine.dje@email.com',
  'Sandrine',
  'Djé',
  '+225 07 65 43 21 09',
  'Beauty Brand CI',
  'Responsable Marketing',
  'TikTok',
  'Paid',
  'Card',
  250000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'influence-marketing-partenariats' AND s.start_date = '2026-03-29'
LIMIT 1;

INSERT INTO registrations (session_id, user_email, first_name, last_name, phone, company, job_title, how_heard, payment_status, payment_method, amount)
SELECT 
  s.id,
  'rachid.toure@email.com',
  'Rachid',
  'Touré',
  '+225 01 11 22 33 44',
  'PR Agency West Africa',
  'PR Manager',
  'LinkedIn',
  'Failed',
  'Card',
  250000
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
WHERE b.slug = 'influence-marketing-partenariats' AND s.start_date = '2026-03-29'
LIMIT 1;


-- ==============================================
-- VÉRIFICATION DES DONNÉES
-- ==============================================

SELECT '✅ Creative Librarys insérés:' as info, COUNT(*) as total FROM Creative Librarys;
SELECT '✅ Sessions insérées:' as info, COUNT(*) as total FROM sessions;
SELECT '✅ Campagnes insérées:' as info, COUNT(*) as total FROM campaigns;
SELECT '✅ Inscriptions insérées:' as info, COUNT(*) as total FROM registrations;

-- Résumé détaillé
SELECT 
  b.title as Creative Library,
  b.level as niveau,
  b.price as prix,
  COUNT(s.id) as nb_sessions,
  SUM(s.max_capacity) as capacite_totale
FROM Creative Librarys b
LEFT JOIN sessions s ON s.Creative Library_id = b.id
GROUP BY b.id, b.title, b.level, b.price
ORDER BY b.title;

SELECT 
  s.start_date,
  b.title as Creative Library,
  s.city,
  s.format,
  s.max_capacity,
  s.available_spots,
  COUNT(r.id) as nb_inscrits
FROM sessions s
JOIN Creative Librarys b ON s.Creative Library_id = b.id
LEFT JOIN registrations r ON r.session_id = s.id
GROUP BY s.id, s.start_date, b.title, s.city, s.format, s.max_capacity, s.available_spots
ORDER BY s.start_date;
