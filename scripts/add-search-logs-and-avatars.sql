-- ============================================================================
-- Search logs (historique détaillé des recherches/filtres utilisés)
-- ============================================================================
create table if not exists public.search_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  query        text,                -- texte saisi dans la barre (peut être null)
  filters      jsonb not null default '{}'::jsonb, -- { Pays: ['CI','SN'], Secteur: [...], ... }
  source       text,                -- 'bar' | 'filter' | autre
  created_at   timestamptz not null default now()
);

create index if not exists search_logs_user_id_created_at_idx
  on public.search_logs(user_id, created_at desc);

alter table public.search_logs enable row level security;

-- Lecture : un user voit ses propres lignes
drop policy if exists "search_logs_select_own" on public.search_logs;
create policy "search_logs_select_own" on public.search_logs
  for select using (auth.uid() = user_id);

-- Insertion : un user insère ses propres lignes (l'API serveur passe via service role)
drop policy if exists "search_logs_insert_own" on public.search_logs;
create policy "search_logs_insert_own" on public.search_logs
  for insert with check (auth.uid() = user_id);

-- ============================================================================
-- Bucket de stockage pour les avatars utilisateurs
-- (à exécuter une seule fois — créé public en lecture, écriture restreinte)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lecture publique
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Upload : un user ne peut écrire que dans son dossier {user_id}/...
drop policy if exists "avatars_user_insert" on storage.objects;
create policy "avatars_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_user_update" on storage.objects;
create policy "avatars_user_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_user_delete" on storage.objects;
create policy "avatars_user_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
