-- =============================================================================
-- Studio publicitaire IA — historique des générations
--
-- Table : ad_generations
-- Bucket : ad-studio (privé — les visuels téléversés sont des créations
--          clientes, aucune URL publique devinable)
--
-- Sert aussi de compteur de quota : le nombre de générations d'un utilisateur
-- sur la journée se lit directement ici, sans table de comptage séparée.
--
-- Autonome : aucune dépendance à une autre migration.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ad_generations (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  -- Chemin dans le bucket `ad-studio` de la création de référence téléversée.
  reference_path       text,
  -- Brief saisi par l'utilisateur (secteur, produit, cible, canal, ton,
  -- émotion, objectif + champs optionnels). jsonb : la liste des champs
  -- évoluera avec les retours terrain, une colonne par champ ne tiendrait pas.
  context              jsonb not null default '{}'::jsonb,

  -- Sorties de l'agent 1 (analyse stratégique de la référence).
  analysis_text        text,
  framework_text       text,
  -- Sortie de l'agent 2.
  result_path          text,

  status               text not null default 'pending',  -- pending | processing | done | error
  error_message        text,
  provider             text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz,

  constraint ad_generations_status_valid
    check (status in ('pending', 'processing', 'done', 'error'))
);

-- Index taillé pour la lecture d'historique ET le comptage du quota du jour.
create index if not exists ad_generations_user_created_idx
  on public.ad_generations(user_id, created_at desc);

drop trigger if exists trg_ad_generations_updated_at on public.ad_generations;
create trigger trg_ad_generations_updated_at
  before update on public.ad_generations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.ad_generations enable row level security;

-- Chacun ne voit que ses propres générations.
drop policy if exists "ad_generations_select_own" on public.ad_generations;
create policy "ad_generations_select_own" on public.ad_generations
  for select to authenticated using (auth.uid() = user_id);

-- Écriture réservée au serveur : c'est lui qui décompte le quota et appelle les
-- fournisseurs. Un client ne doit pas pouvoir s'inventer des lignes terminées
-- pour contourner la limite journalière.
revoke all on public.ad_generations from anon, authenticated;
grant select on public.ad_generations to authenticated;
grant all    on public.ad_generations to service_role;

-- -----------------------------------------------------------------------------
-- Bucket privé pour références téléversées et visuels générés
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ad-studio', 'ad-studio', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select count(*) from public.ad_generations;                    -- 0, sans erreur
--   insert into public.ad_generations (user_id, status)
--     values (auth.uid(), 'termine');                              -- doit ÉCHOUER (statut invalide)
-- -----------------------------------------------------------------------------
