-- =============================================================================
-- Onboarding obligatoire Laveiye
-- Tables: profiles, sectors, profile_sectors, analytics_events
-- + seed des secteurs, index, RLS, trigger updated_at
-- =============================================================================

-- Fonction utilitaire updated_at (idempotente)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles : 1 ligne par utilisateur, porte l'état de complétion onboarding
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  country                 text,
  job_function            text,
  job_function_other      text,
  onboarding_completed    boolean not null default false,
  onboarding_completed_at timestamptz,
  profile_completed       boolean not null default false,
  profile_completed_at    timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists profiles_profile_completed_idx on public.profiles(profile_completed);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- sectors : liste évolutive des secteurs d'activité (source de vérité Supabase)
-- -----------------------------------------------------------------------------
create table if not exists public.sectors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists sectors_active_order_idx on public.sectors(is_active, display_order);

-- -----------------------------------------------------------------------------
-- profile_sectors : secteurs choisis par un profil (max 3 côté applicatif)
-- -----------------------------------------------------------------------------
create table if not exists public.profile_sectors (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  sector_id          uuid not null references public.sectors(id) on delete cascade,
  sector_other_value text,
  created_at         timestamptz not null default now(),
  unique (profile_id, sector_id)
);

create index if not exists profile_sectors_profile_idx on public.profile_sectors(profile_id);

-- -----------------------------------------------------------------------------
-- analytics_events : miroir Supabase des événements critiques (GA4 = secondaire)
-- -----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event_name text not null,
  source     text not null default 'web',
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_idx on public.analytics_events(user_id);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at);

-- =============================================================================
-- Seed des secteurs (ON CONFLICT DO NOTHING → ré-exécutable sans doublon)
-- =============================================================================
insert into public.sectors (name, slug, display_order) values
  ('Agriculture', 'agriculture', 10),
  ('Agroalimentaire', 'agroalimentaire', 20),
  ('Boissons', 'boissons', 30),
  ('Eau / Boissons non alcoolisées', 'eau-boissons-non-alcoolisees', 40),
  ('Spiritueux / Alcool', 'spiritueux-alcool', 50),
  ('Restauration', 'restauration', 60),
  ('Fast-food', 'fast-food', 70),
  ('Grande distribution', 'grande-distribution', 80),
  ('Retail / Distribution', 'retail-distribution', 90),
  ('E-commerce', 'e-commerce', 100),
  ('Marketplace', 'marketplace', 110),
  ('Banque / Finance', 'banque-finance', 120),
  ('Fintech', 'fintech', 130),
  ('Assurance', 'assurance', 140),
  ('Microfinance', 'microfinance', 150),
  ('Télécommunications', 'telecommunications', 160),
  ('Technologie', 'technologie', 170),
  ('SaaS / Logiciel', 'saas-logiciel', 180),
  ('Intelligence artificielle', 'intelligence-artificielle', 190),
  ('Cybersécurité', 'cybersecurite', 200),
  ('Électronique', 'electronique', 210),
  ('Automobile', 'automobile', 220),
  ('Transport', 'transport', 230),
  ('VTC / Mobilité', 'vtc-mobilite', 240),
  ('Logistique', 'logistique', 250),
  ('Livraison', 'livraison', 260),
  ('Immobilier', 'immobilier', 270),
  ('BTP / Construction', 'btp-construction', 280),
  ('Énergie', 'energie', 290),
  ('Eau / Assainissement', 'eau-assainissement', 300),
  ('Santé', 'sante', 310),
  ('Pharmacie', 'pharmacie', 320),
  ('Bien-être', 'bien-etre', 330),
  ('Beauté / Cosmétique', 'beaute-cosmetique', 340),
  ('Mode / Textile', 'mode-textile', 350),
  ('Luxe', 'luxe', 360),
  ('Éducation', 'education', 370),
  ('Formation', 'formation', 380),
  ('Recrutement / RH', 'recrutement-rh', 390),
  ('Services professionnels', 'services-professionnels', 400),
  ('Conseil', 'conseil', 410),
  ('Communication / Marketing', 'communication-marketing', 420),
  ('Agence créative', 'agence-creative', 430),
  ('Médias', 'medias', 440),
  ('Presse', 'presse', 450),
  ('Radio / Télévision', 'radio-television', 460),
  ('Streaming / Divertissement', 'streaming-divertissement', 470),
  ('Culture', 'culture', 480),
  ('Musique', 'musique', 490),
  ('Cinéma', 'cinema', 500),
  ('Sport', 'sport', 510),
  ('Gaming', 'gaming', 520),
  ('Événementiel', 'evenementiel', 530),
  ('Tourisme', 'tourisme', 540),
  ('Hôtellerie', 'hotellerie', 550),
  ('Voyage', 'voyage', 560),
  ('Aviation', 'aviation', 570),
  ('Gouvernement / Institution publique', 'gouvernement-institution-publique', 580),
  ('ONG / Association', 'ong-association', 590),
  ('Développement durable / RSE', 'developpement-durable-rse', 600),
  ('Religion / Communauté', 'religion-communaute', 610),
  ('Enfance / Jeunesse', 'enfance-jeunesse', 620),
  ('Sécurité', 'securite', 630),
  ('Services à domicile', 'services-a-domicile', 640),
  ('Autre', 'autre', 9999)
on conflict (slug) do nothing;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles        enable row level security;
alter table public.sectors         enable row level security;
alter table public.profile_sectors enable row level security;
alter table public.analytics_events enable row level security;

-- profiles : chaque utilisateur lit/écrit uniquement son profil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sectors : lecture publique des secteurs actifs (liste de référence)
drop policy if exists "sectors_select_active" on public.sectors;
create policy "sectors_select_active" on public.sectors
  for select using (is_active = true);

-- profile_sectors : l'utilisateur gère les secteurs de SON profil
drop policy if exists "profile_sectors_select_own" on public.profile_sectors;
create policy "profile_sectors_select_own" on public.profile_sectors
  for select using (
    exists (select 1 from public.profiles p
            where p.id = profile_sectors.profile_id and p.user_id = auth.uid())
  );

drop policy if exists "profile_sectors_insert_own" on public.profile_sectors;
create policy "profile_sectors_insert_own" on public.profile_sectors
  for insert with check (
    exists (select 1 from public.profiles p
            where p.id = profile_sectors.profile_id and p.user_id = auth.uid())
  );

drop policy if exists "profile_sectors_delete_own" on public.profile_sectors;
create policy "profile_sectors_delete_own" on public.profile_sectors
  for delete using (
    exists (select 1 from public.profiles p
            where p.id = profile_sectors.profile_id and p.user_id = auth.uid())
  );

-- analytics_events : l'utilisateur peut insérer ses propres événements,
-- lecture réservée au service role (admin) → aucune policy SELECT publique.
drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own" on public.analytics_events
  for insert with check (auth.uid() = user_id or user_id is null);
