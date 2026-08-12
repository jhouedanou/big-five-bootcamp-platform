-- =============================================================================
-- Commentaires de campagnes
-- Tables: campaign_comments, comment_reports (+ index, RLS, trigger updated_at)
--
-- Remplace, CÔTÉ FRONT UNIQUEMENT, les sections « Analyse » et « Comment s'en
-- servir » de la page détail. Les colonnes campaigns.analyse / campaigns.how_to_use
-- restent en base : ce sont des champs premium (lib/content-access.ts) et les
-- sources du générateur IA (app/actions/campaign-generator.ts). Ne pas les droper.
--
-- Dépend de #1 (fonction public.set_updated_at()).
-- =============================================================================

create table if not exists public.campaign_comments (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- parent_id : non utilisé en v1 (commentaires à plat). Présent d'avance pour
  -- que l'option « réponses en fil » ne coûte pas une migration de plus.
  parent_id     uuid references public.campaign_comments(id) on delete cascade,
  body          text not null,
  is_official   boolean not null default false,  -- réponse admin mise en avant
  is_pinned     boolean not null default false,  -- épinglé en tête de liste
  is_hidden     boolean not null default false,  -- masqué par modération
  hidden_reason text,
  edited_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint campaign_comments_body_len
    check (char_length(btrim(body)) between 1 and 1500)
);

-- Liste d'une campagne : épinglés d'abord, puis antéchronologique.
create index if not exists campaign_comments_campaign_idx
  on public.campaign_comments(campaign_id, is_pinned desc, created_at desc);
create index if not exists campaign_comments_user_idx
  on public.campaign_comments(user_id);
create index if not exists campaign_comments_parent_idx
  on public.campaign_comments(parent_id) where parent_id is not null;

drop trigger if exists trg_campaign_comments_updated_at on public.campaign_comments;
create trigger trg_campaign_comments_updated_at
  before update on public.campaign_comments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Signalements (modération a posteriori)
-- -----------------------------------------------------------------------------
create table if not exists public.comment_reports (
  id               uuid primary key default gen_random_uuid(),
  comment_id       uuid not null references public.campaign_comments(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason           text,
  status           text not null default 'open',  -- open | reviewed | dismissed
  created_at       timestamptz not null default now(),
  -- un utilisateur ne signale un commentaire qu'une fois
  unique (comment_id, reporter_user_id)
);

create index if not exists comment_reports_status_idx
  on public.comment_reports(status, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.campaign_comments enable row level security;
alter table public.comment_reports   enable row level security;

-- Lecture : tout utilisateur connecté voit les commentaires non masqués.
drop policy if exists "campaign_comments_select_visible" on public.campaign_comments;
create policy "campaign_comments_select_visible" on public.campaign_comments
  for select to authenticated using (is_hidden = false);

-- Écriture : chacun ne crée / modifie / supprime que ses propres commentaires.
drop policy if exists "campaign_comments_insert_own" on public.campaign_comments;
create policy "campaign_comments_insert_own" on public.campaign_comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "campaign_comments_update_own" on public.campaign_comments;
create policy "campaign_comments_update_own" on public.campaign_comments
  for update to authenticated
  using (auth.uid() = user_id and is_hidden = false)
  with check (auth.uid() = user_id);

drop policy if exists "campaign_comments_delete_own" on public.campaign_comments;
create policy "campaign_comments_delete_own" on public.campaign_comments
  for delete to authenticated using (auth.uid() = user_id);

-- Signalements : insert-only côté utilisateur (aucune policy select, à l'image
-- de analytics_events) — la file de modération est lue par la service role.
drop policy if exists "comment_reports_insert_own" on public.comment_reports;
create policy "comment_reports_insert_own" on public.comment_reports
  for insert to authenticated with check (auth.uid() = reporter_user_id);

-- -----------------------------------------------------------------------------
-- GRANTs au niveau colonne
--
-- Les policies RLS ne savent pas restreindre QUELLES colonnes un UPDATE touche.
-- Sans ces grants, un utilisateur pourrait taper l'API REST Supabase avec son
-- propre token et passer son commentaire en is_official / is_pinned, ou lever
-- son propre is_hidden. Les flags de modération sont donc réservés au serveur.
-- -----------------------------------------------------------------------------
revoke all on public.campaign_comments from anon, authenticated;
grant select                                 on public.campaign_comments to authenticated;
grant insert (campaign_id, user_id, body)    on public.campaign_comments to authenticated;
grant update (body, edited_at)               on public.campaign_comments to authenticated;
grant delete                                 on public.campaign_comments to authenticated;
grant all                                    on public.campaign_comments to service_role;

revoke all on public.comment_reports from anon, authenticated;
grant insert (comment_id, reporter_user_id, reason) on public.comment_reports to authenticated;
grant all on public.comment_reports to service_role;

-- -----------------------------------------------------------------------------
-- Vérification post-migration (SQL Editor)
--   select count(*) from public.campaign_comments;                  -- 0, sans erreur
--   insert into public.campaign_comments (campaign_id, user_id, body)
--     values ('<uuid campagne>', auth.uid(), '');                   -- doit ÉCHOUER (check longueur)
--   update public.campaign_comments set is_pinned = true;           -- doit ÉCHOUER pour authenticated
-- -----------------------------------------------------------------------------
