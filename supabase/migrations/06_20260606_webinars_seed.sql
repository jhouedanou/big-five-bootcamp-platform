-- =============================================================================
-- Seed : 2 webinaires #BigFiveDécrypte publiés (démo / lancement).
-- Idempotent : on conflict (slug) do nothing.
-- Dépend de 20260606_webinars.sql.
-- =============================================================================

insert into public.webinars (
  title, slug, short_description, full_description,
  date, start_time, end_time, timezone,
  meeting_link, speaker_name,
  status, registration_enabled, public_preview_enabled, max_participants
) values
(
  'Décrypter les campagnes qui ont marqué 2026',
  'decrypte-campagnes-marquantes-2026',
  'Analyse des campagnes les plus performantes d''Afrique francophone et des leviers créatifs à retenir.',
  'Une session pour décortiquer les campagnes marquantes de l''année : insights créatifs, choix média, activation social et résultats. Repartez avec des idées actionnables pour vos propres marques.',
  '2026-07-15', '18:00', '19:30', 'Africa/Abidjan',
  'https://meet.google.com/lookup/bigfive-decrypte-juillet',
  'Équipe Big Five',
  'published', true, true, 100
),
(
  'Construire une marque forte sur les réseaux sociaux',
  'construire-marque-forte-reseaux-sociaux',
  'Méthodes et frameworks pour bâtir une identité de marque cohérente et engageante sur les plateformes sociales.',
  'Atelier pratique : positionnement, ligne éditoriale, formats qui convertissent et mesure de la performance. Études de cas locales à l''appui.',
  '2026-08-12', '18:00', '19:30', 'Africa/Abidjan',
  'https://meet.google.com/lookup/bigfive-decrypte-aout',
  'Équipe Big Five',
  'published', true, true, 100
)
on conflict (slug) do nothing;
