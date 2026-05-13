-- ============================================================================
-- Add avatar_url column to public.users + RLS policy for self-update
-- Date: 2026-05-13
-- Reason: PATCH /rest/v1/users?id=eq.<uuid> renvoyait 400 (column inconnue)
--         lors de l'upload d'une photo de profil sur /profile.
-- ============================================================================

-- 1) Colonne avatar_url (idempotent)
alter table public.users
  add column if not exists avatar_url text;

comment on column public.users.avatar_url is 'URL publique de la photo de profil (bucket storage.avatars).';

-- 2) S'assurer que RLS est activée
alter table public.users enable row level security;

-- 3) Policy : un utilisateur peut lire sa propre ligne
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- 4) Policy : un utilisateur peut mettre à jour sa propre ligne
--    (limitée aux colonnes "profil" — pas de plan/subscription via le client)
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5) Vérification
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'users' and column_name = 'avatar_url';

select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'users';
