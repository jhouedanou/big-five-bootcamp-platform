-- ==============================================
-- Ajouter "Agency" aux plans autorisés
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================

-- 1. Supprimer la contrainte CHECK existante sur le plan
-- (le nom exact de la contrainte peut varier - essayer les deux)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check1;

-- 2. Recréer la contrainte avec Agency inclus
ALTER TABLE public.users ADD CONSTRAINT users_plan_check 
  CHECK (plan IN ('Free', 'Basic', 'Pro', 'Premium', 'Agency', 'Enterprise'));

-- 3. Mettre à jour le plan de cossi@bigfiveabidjan.com en Agency
UPDATE public.users 
SET plan = 'Agency' 
WHERE email = 'cossi@bigfiveabidjan.com';

-- Vérification
SELECT id, email, plan, role FROM public.users WHERE email = 'cossi@bigfiveabidjan.com';
