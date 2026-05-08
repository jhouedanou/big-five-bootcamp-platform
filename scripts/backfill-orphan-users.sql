-- =====================================================================
-- BACKFILL des utilisateurs orphelins dans public.users
--
-- À exécuter dans le SQL Editor de Supabase.
-- Crée les lignes manquantes en copiant les données depuis auth.users.
-- =====================================================================

-- Étape 1 : Voir quels utilisateurs seront insérés (lecture seule, sans risque)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name,
  COUNT(br.id) AS nb_demandes
FROM public.brand_requests br
JOIN auth.users au ON au.id = br.user_id
LEFT JOIN public.users pu ON pu.id = br.user_id
WHERE pu.id IS NULL
GROUP BY au.id, au.email, au.raw_user_meta_data
ORDER BY nb_demandes DESC;


-- Étape 2 : Insérer les lignes manquantes (décommentez pour exécuter)
INSERT INTO public.users (id, email, name, plan, subscription_status)
SELECT DISTINCT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'free',
  'inactive'
FROM public.brand_requests br
JOIN auth.users au ON au.id = br.user_id
LEFT JOIN public.users pu ON pu.id = br.user_id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;


-- Étape 3 : Passer cossi en admin/Pro (décommentez APRÈS l'étape 2)
UPDATE public.users
SET plan = 'Pro',
    subscription_status = 'active',
    subscription_end_date = NOW() + INTERVAL '1 year'
WHERE email = 'cossi@bigfiveabidjan.com';



-- Étape 4 : Vérification finale — doit retourner 0
SELECT COUNT(*) AS orphelins_restants
FROM public.brand_requests br
LEFT JOIN public.users pu ON pu.id = br.user_id
WHERE pu.id IS NULL;
