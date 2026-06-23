-- =============================================================================
-- Webinaires #BigFiveDécrypte
-- Tables: webinars, webinar_registrations (+ index, RLS, trigger updated_at)
-- Indépendant des tables decrypte_* existantes (sémantique différente).
-- =============================================================================

create table if not exists public.webinars (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  slug                   text not null unique,
  short_description      text,
  full_description       text,
  date                   date not null,
  start_time             time,
  end_time               time,
  timezone               text not null default 'Africa/Abidjan',
  meeting_link           text,
  speaker_name           text,
  status                 text not null default 'draft',  -- draft | published | completed | cancelled
  registration_enabled   boolean not null default true,
  public_preview_enabled boolean not null default true,
  max_participants       integer,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists webinars_status_idx on public.webinars(status);
create index if not exists webinars_date_idx   on public.webinars(date);

drop trigger if exists trg_webinars_updated_at on public.webinars;
create trigger trg_webinars_updated_at
  before update on public.webinars
  for each row execute function public.set_updated_at();

create table if not exists public.webinar_registrations (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  webinar_id                uuid not null references public.webinars(id) on delete cascade,
  registration_status       text not null default 'registered', -- registered | cancelled | attended | no_show
  registered_at             timestamptz not null default now(),
  confirmation_email_sent   boolean not null default false,
  confirmation_email_sent_at timestamptz,
  calendar_added_at         timestamptz,
  unique (user_id, webinar_id)
);

create index if not exists webinar_registrations_webinar_idx on public.webinar_registrations(webinar_id);
create index if not exists webinar_registrations_user_idx    on public.webinar_registrations(user_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.webinars              enable row level security;
alter table public.webinar_registrations enable row level security;

-- Lecture publique des webinaires publiés (alimente /webinaires + preview).
drop policy if exists "webinars_select_published" on public.webinars;
create policy "webinars_select_published" on public.webinars
  for select using (status = 'published');

-- Inscriptions : chaque utilisateur gère/voit les siennes.
drop policy if exists "webinar_registrations_select_own" on public.webinar_registrations;
create policy "webinar_registrations_select_own" on public.webinar_registrations
  for select using (auth.uid() = user_id);

drop policy if exists "webinar_registrations_insert_own" on public.webinar_registrations;
create policy "webinar_registrations_insert_own" on public.webinar_registrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "webinar_registrations_update_own" on public.webinar_registrations;
create policy "webinar_registrations_update_own" on public.webinar_registrations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NB : l'admin (service role) bypass RLS pour le CRUD complet et les comptages.
