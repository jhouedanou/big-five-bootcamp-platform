-- =============================================================================
-- Analytics : colonne page_url sur analytics_events.
-- Idempotent. Dépend de 20260604_onboarding.sql (création de la table).
-- =============================================================================

alter table public.analytics_events add column if not exists page_url text;
