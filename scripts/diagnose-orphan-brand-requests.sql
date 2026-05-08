-- =====================================================================
-- Diagnostic + backfill : brand_requests rattachées à un user_id qui
-- n'a PAS de ligne correspondante dans public.users.
--
-- Pourquoi ce script ?
--   La FK brand_requests.user_id pointe sur auth.users(id) (cf.
--   create-brand-requests-table.sql). L'API admin fait un join sur
--   public.users via `user:users!user_id(...)`. Si la ligne dans
--   public.users est absente, le join renvoie NULL et l'UI affiche
--   "Client inconnu" — toutes les demandes orphelines se retrouvent
--   collées sous un même groupe.
--
-- À exécuter dans le SQL Editor de Supabase, étape par étape.
-- =====================================================================


-- 1) Cas spécifique : où en est cossi@bigfiveabidjan.com ?
SELECT
  'auth.users' AS source,
  au.id,
  au.email,
  au.raw_user_meta_data->>'name' AS name,
  au.created_at
FROM auth.users au
WHERE au.email = 'cossi@bigfiveabidjan.com'
UNION ALL
SELECT
  'public.users' AS source,
  pu.id,
  pu.email,
  pu.name,
  pu.created_at
FROM public.users pu
WHERE pu.email = 'cossi@bigfiveabidjan.com';


-- 2) Liste des demandes orphelines : user_id présent en colonne,
--    mais sans ligne correspondante dans public.users.
--    On joint auth.users pour récupérer email/nom et identifier le
--    propriétaire réel.
SELECT
  br.id              AS brand_request_id,
  br.brand_name,
  br.status,
  br.created_at,
  br.user_id         AS auth_user_id,
  au.email           AS auth_email,
  au.raw_user_meta_data->>'name' AS auth_name,
  CASE WHEN au.id IS NULL THEN 'auth.users absent — donnée corrompue'
       ELSE 'auth.users OK — public.users à backfiller'
  END AS diagnostic
FROM public.brand_requests br
LEFT JOIN public.users   pu ON pu.id = br.user_id
LEFT JOIN auth.users     au ON au.id = br.user_id
WHERE pu.id IS NULL
ORDER BY br.created_at DESC;


-- 3) Comptes uniques touchés (un email = une ligne).
SELECT
  br.user_id              AS auth_user_id,
  au.email,
  au.raw_user_meta_data->>'name' AS name,
  COUNT(*)                AS nb_demandes_orphelines
FROM public.brand_requests br
LEFT JOIN public.users pu ON pu.id = br.user_id
LEFT JOIN auth.users   au ON au.id = br.user_id
WHERE pu.id IS NULL
GROUP BY br.user_id, au.email, au.raw_user_meta_data->>'name'
ORDER BY nb_demandes_orphelines DESC;


-- =====================================================================
-- 4) BACKFILL — à exécuter UNIQUEMENT après avoir lu le résultat de (2)/(3).
--    Crée les lignes manquantes dans public.users en s'appuyant sur
--    auth.users. Plan par défaut = 'free' / status = 'active'. Ajustez
--    ensuite cossi à la main (admin) ou via upgrade-cossi-pro.sql.
--
--    NOTE : adaptez les colonnes (role, plan, status, subscription_status)
--    si votre schéma public.users diffère.
-- =====================================================================

-- INSERT INTO public.users (id, email, name, role, plan, status)
-- SELECT DISTINCT
--   au.id,
--   au.email,
--   COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
--   'user',
--   'free',
--   'active'
-- FROM public.brand_requests br
-- JOIN auth.users      au ON au.id = br.user_id
-- LEFT JOIN public.users pu ON pu.id = br.user_id
-- WHERE pu.id IS NULL
-- ON CONFLICT (id) DO NOTHING;


-- 5) Re-vérification : plus aucune demande orpheline ne doit ressortir.
-- SELECT COUNT(*) AS orphan_remaining
-- FROM public.brand_requests br
-- LEFT JOIN public.users pu ON pu.id = br.user_id
-- WHERE pu.id IS NULL;


-- 6) Cas particulier cossi : si la ligne public.users est créée par (4)
--    mais avec plan='free', la repasser en admin/Pro :
-- UPDATE public.users
-- SET role = 'admin',
--     plan = 'Pro',
--     status = 'active'
-- WHERE email = 'cossi@bigfiveabidjan.com';
