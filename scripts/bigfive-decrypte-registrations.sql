-- ============================================================
-- BigFiveDecrypte registrations table
-- Pro-only debrief session signups. Collected by the platform,
-- contacted externally (Zoom/Meet/Mailchimp) by the Big Five team.
-- Date: 2026-05-15
-- ============================================================

CREATE TABLE IF NOT EXISTS public.decrypte_registrations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid REFERENCES public.users(id) ON DELETE SET NULL,
    email               text NOT NULL,
    full_name           text NOT NULL,
    phone               text,
    company             text,
    job_title           text,
    topics_of_interest  text,
    preferred_channel   text,
    -- Plan at the moment of registration. We freeze it so we can audit
    -- later if anyone managed to register from a non-Pro account.
    plan_at_signup      text NOT NULL,
    -- Session/month tag (e.g. "2026-05"). Default = current month.
    session_month       text NOT NULL DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM'),
    consent_contact     boolean NOT NULL DEFAULT false,
    -- Mailchimp sync state
    mailchimp_synced_at timestamptz,
    mailchimp_status    text,
    mailchimp_error     text,
    -- Provenance / debug
    source              text,
    ip                  text,
    user_agent          text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- One signup per user per session (idempotent re-submit returns 409)
CREATE UNIQUE INDEX IF NOT EXISTS decrypte_registrations_user_month_key
    ON public.decrypte_registrations (user_id, session_month)
    WHERE user_id IS NOT NULL;

-- Index for admin export and Mailchimp follow-up
CREATE INDEX IF NOT EXISTS decrypte_registrations_session_month_idx
    ON public.decrypte_registrations (session_month, created_at DESC);

CREATE INDEX IF NOT EXISTS decrypte_registrations_email_idx
    ON public.decrypte_registrations (lower(email));

-- RLS — only service role writes (the API route uses service role)
ALTER TABLE public.decrypte_registrations ENABLE ROW LEVEL SECURITY;

-- Users can read their own registrations (optional, for "you are registered" UI)
DROP POLICY IF EXISTS decrypte_registrations_select_own
    ON public.decrypte_registrations;
CREATE POLICY decrypte_registrations_select_own
    ON public.decrypte_registrations
    FOR SELECT
    USING (auth.uid() = user_id);

-- No anon insert/update/delete — only service role (API route) writes.
