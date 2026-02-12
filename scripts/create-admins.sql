-- ==============================================
-- SCRIPT DE CRÉATION DES ADMINISTRATEURS
-- À exécuter dans Supabase SQL Editor
-- ==============================================
--
-- Ce script crée les profils admin dans la table public.users.
-- Les comptes auth doivent être créés MANUELLEMENT dans :
-- Supabase Dashboard > Authentication > Users > Add User
--
-- Pour chaque admin :
--   1. Allez dans Authentication > Users > "Add User"
--   2. Entrez l'email et un mot de passe sécurisé
--   3. Cochez "Auto Confirm User"
--   4. Cliquez "Create User"
--   5. Copiez l'UUID généré
--   6. Remplacez le UUID ci-dessous par le vrai UUID
--   7. Exécutez ce script
--
-- ==============================================

-- IMPORTANT : Remplacez les UUID ci-dessous par les vrais UUID
-- générés par Supabase Auth lors de la création manuelle des comptes

-- Jean-Luc
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- REMPLACER par le vrai UUID de jeanluc
  'jeanluc@bigfiveabidjan.com',
  'Jean-Luc',
  'admin',
  'Premium',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan = 'Premium',
  status = 'active',
  updated_at = NOW();

-- Cossi
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- REMPLACER par le vrai UUID de cossi
  'cossi@bigfiveabidjan.com',
  'Cossi',
  'admin',
  'Premium',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan = 'Premium',
  status = 'active',
  updated_at = NOW();

-- Yannick J
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  '00000000-0000-0000-0000-000000000003', -- REMPLACER par le vrai UUID de yannickj
  'yannick@bigfiveabidjan.com',
  'Yannick J',
  'admin',
  'Premium',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan = 'Premium',
  status = 'active',
  updated_at = NOW();

-- Franck
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  '38b17322-0b5a-4023-98f2-32410786b8d2', -- UUID réel (déjà créé)
  'franck@bigfiveabidjan.com',
  'Franck',
  'admin',
  'Premium',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan = 'Premium',
  status = 'active',
  updated_at = NOW();

-- Stéphanie
INSERT INTO public.users (id, email, name, role, plan, status)
VALUES (
  'c661d757-6e1d-4045-9baa-60c7cb0abe1a', -- UUID réel (déjà créé)
  'stephanie@bigfiveabidjan.com',
  'Stéphanie',
  'admin',
  'Premium',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan = 'Premium',
  status = 'active',
  updated_at = NOW();

-- ==============================================
-- VÉRIFICATION
-- ==============================================
SELECT id, email, name, role, plan, status, created_at
FROM public.users
WHERE role = 'admin'
ORDER BY created_at;

-- ==============================================
-- ALTERNATIVE RAPIDE : Si les comptes auth existent déjà,
-- ce script met à jour le rôle en admin par email
-- (sans avoir besoin des UUID)
-- ==============================================
/*
UPDATE public.users SET role = 'admin', plan = 'Premium', status = 'active', updated_at = NOW()
WHERE email IN (
  'jeanluc@bigfiveabidjan.com',
  'cossi@bigfiveabidjan.com',
  'yannick@bigfiveabidjan.com',
  'franck@bigfiveabidjan.com',
  'stephanie@bigfiveabidjan.com'
);
*/
