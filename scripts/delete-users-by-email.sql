-- ============================================================
-- Suppression de comptes Supabase par email
-- Date: 2026-05-15
--
-- Cible:
--   - jhouedanou@gmail.com
--   - jeanluc@houedanou.com
--   - jhouedanou@yandex.com
--
-- IMPORTANT:
--   1) Executer dans le SQL Editor Supabase avec un role admin.
--   2) Verifier les SELECT d'audit avant de garder le COMMIT.
--   3) Si un resultat est inattendu, remplacer COMMIT par ROLLBACK.
--
-- Ce script supprime:
--   - les donnees applicatives courantes liees a ces user_id/emails
--   - les profils public.users
--   - les comptes auth.users
--
-- Les DELETE passent par des blocs conditionnels pour ne pas echouer si
-- certaines tables optionnelles n'existent pas encore dans l'environnement.
-- ============================================================

BEGIN;

-- 1) Liste des emails cibles
CREATE TEMP TABLE target_user_emails (
    email text PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO target_user_emails (email)
VALUES
    ('jhouedanou@gmail.com'),
    ('jeanluc@houedanou.com'),
    ('jhouedanou@yandex.com');

-- 2) Comptes trouves dans auth.users et public.users
CREATE TEMP TABLE target_user_ids AS
WITH matched_ids AS (
    SELECT au.id
    FROM auth.users au
    JOIN target_user_emails t ON LOWER(au.email) = t.email

    UNION

    SELECT pu.id
    FROM public.users pu
    JOIN target_user_emails t ON LOWER(pu.email) = t.email
)
SELECT
    mi.id AS user_id,
    au.email AS auth_email,
    pu.email AS public_email,
    au.created_at AS auth_created_at,
    pu.created_at AS public_created_at
FROM matched_ids mi
LEFT JOIN auth.users au ON au.id = mi.id
LEFT JOIN public.users pu ON pu.id = mi.id;

-- Audit A: verifier les comptes qui seront vises.
SELECT
    t.email AS requested_email,
    ids.user_id,
    ids.auth_email,
    ids.public_email,
    ids.auth_created_at,
    ids.public_created_at
FROM target_user_emails t
LEFT JOIN target_user_ids ids
    ON LOWER(COALESCE(ids.auth_email, ids.public_email)) = t.email
ORDER BY t.email;

-- Audit B: verifier rapidement les volumes qui seront touches.
CREATE TEMP TABLE deletion_preview (
    table_name text NOT NULL,
    rows_to_delete bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO deletion_preview
SELECT 'auth.users', COUNT(*)
FROM auth.users
WHERE id IN (SELECT user_id FROM target_user_ids);

INSERT INTO deletion_preview
SELECT 'public.users', COUNT(*)
FROM public.users
WHERE id IN (SELECT user_id FROM target_user_ids);

DO $$
DECLARE
    n bigint;
    payment_where text[];
BEGIN
    IF to_regclass('public.favorites') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.favorites WHERE user_id IN (SELECT user_id FROM target_user_ids)'
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.favorites', n);
    END IF;

    IF to_regclass('public.reactions') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.reactions WHERE user_id IN (SELECT user_id FROM target_user_ids)'
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.reactions', n);
    END IF;

    IF to_regclass('public.notifications') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.notifications WHERE user_id IN (SELECT user_id FROM target_user_ids)'
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.notifications', n);
    END IF;

    IF to_regclass('public.search_logs') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.search_logs WHERE user_id IN (SELECT user_id FROM target_user_ids)'
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.search_logs', n);
    END IF;

    IF to_regclass('public.collection_items') IS NOT NULL
       AND to_regclass('public.collections') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM public.collection_items ci
            JOIN public.collections c ON c.id = ci.collection_id
            WHERE c.user_id IN (SELECT user_id FROM target_user_ids)
        '
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.collection_items', n);
    END IF;

    IF to_regclass('public.collections') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.collections WHERE user_id IN (SELECT user_id FROM target_user_ids)'
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.collections', n);
    END IF;

    IF to_regclass('public.brand_request_campaigns') IS NOT NULL
       AND to_regclass('public.brand_requests') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM public.brand_request_campaigns brc
            JOIN public.brand_requests br ON br.id = brc.brand_request_id
            WHERE br.user_id IN (SELECT user_id FROM target_user_ids)
        '
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.brand_request_campaigns', n);
    END IF;

    IF to_regclass('public.brand_requests') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public.brand_requests WHERE user_id IN (SELECT user_id FROM target_user_ids)'
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.brand_requests', n);
    END IF;

    IF to_regclass('public.decrypte_registrations') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM public.decrypte_registrations
            WHERE user_id IN (SELECT user_id FROM target_user_ids)
               OR LOWER(email) IN (SELECT email FROM target_user_emails)
        '
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.decrypte_registrations', n);
    END IF;

    IF to_regclass('public.subscription_cancellation_requests') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM public.subscription_cancellation_requests
            WHERE user_id IN (SELECT user_id FROM target_user_ids)
        '
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.subscription_cancellation_requests', n);
    END IF;

    IF to_regclass('public.payments') IS NOT NULL THEN
        payment_where := ARRAY[]::text[];

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_id'
        ) THEN
            payment_where := payment_where || 'user_id IN (SELECT user_id FROM target_user_ids)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_email'
        ) THEN
            payment_where := payment_where || 'LOWER(user_email) IN (SELECT email FROM target_user_emails)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'client_email'
        ) THEN
            payment_where := payment_where || 'LOWER(client_email) IN (SELECT email FROM target_user_emails)';
        END IF;

        IF array_length(payment_where, 1) IS NOT NULL THEN
            EXECUTE 'SELECT COUNT(*) FROM public.payments WHERE ' || array_to_string(payment_where, ' OR ')
            INTO n;
            INSERT INTO deletion_preview VALUES ('public.payments', n);
        END IF;
    END IF;

    IF to_regclass('public.keynote_registrations') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM public.keynote_registrations
            WHERE LOWER(email) IN (SELECT email FROM target_user_emails)
        '
        INTO n;
        INSERT INTO deletion_preview VALUES ('public.keynote_registrations', n);
    END IF;

    IF to_regclass('storage.objects') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM storage.objects so
            JOIN target_user_ids ids ON so.name LIKE ids.user_id::text || ''/%''
            WHERE so.bucket_id = ''avatars''
        '
        INTO n;
        INSERT INTO deletion_preview VALUES ('storage.objects:avatars', n);
    END IF;
END $$;

SELECT *
FROM deletion_preview
ORDER BY table_name;

-- 3) Suppression des donnees dependantes.
DO $$
DECLARE
    payment_where text[];
BEGIN
    IF to_regclass('public.collection_items') IS NOT NULL
       AND to_regclass('public.collections') IS NOT NULL THEN
        EXECUTE '
            DELETE FROM public.collection_items ci
            USING public.collections c
            WHERE c.id = ci.collection_id
              AND c.user_id IN (SELECT user_id FROM target_user_ids)
        ';
    END IF;

    IF to_regclass('public.brand_request_campaigns') IS NOT NULL
       AND to_regclass('public.brand_requests') IS NOT NULL THEN
        EXECUTE '
            DELETE FROM public.brand_request_campaigns brc
            USING public.brand_requests br
            WHERE br.id = brc.brand_request_id
              AND br.user_id IN (SELECT user_id FROM target_user_ids)
        ';
    END IF;

    IF to_regclass('public.favorites') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.favorites WHERE user_id IN (SELECT user_id FROM target_user_ids)';
    END IF;

    IF to_regclass('public.reactions') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.reactions WHERE user_id IN (SELECT user_id FROM target_user_ids)';
    END IF;

    IF to_regclass('public.notifications') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.notifications WHERE user_id IN (SELECT user_id FROM target_user_ids)';
    END IF;

    IF to_regclass('public.search_logs') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.search_logs WHERE user_id IN (SELECT user_id FROM target_user_ids)';
    END IF;

    IF to_regclass('public.collections') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.collections WHERE user_id IN (SELECT user_id FROM target_user_ids)';
    END IF;

    IF to_regclass('public.brand_requests') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.brand_requests WHERE user_id IN (SELECT user_id FROM target_user_ids)';
    END IF;

    IF to_regclass('public.decrypte_registrations') IS NOT NULL THEN
        EXECUTE '
            DELETE FROM public.decrypte_registrations
            WHERE user_id IN (SELECT user_id FROM target_user_ids)
               OR LOWER(email) IN (SELECT email FROM target_user_emails)
        ';
    END IF;

    IF to_regclass('public.subscription_cancellation_requests') IS NOT NULL THEN
        EXECUTE '
            DELETE FROM public.subscription_cancellation_requests
            WHERE user_id IN (SELECT user_id FROM target_user_ids)
        ';
    END IF;

    -- Pour ces comptes cibles, on supprime aussi l'historique de paiement
    -- rattache par user_id ou email. Si vous devez garder l'audit financier,
    -- commentez ce bloc et anonymisez plutot les colonnes email.
    IF to_regclass('public.payments') IS NOT NULL THEN
        payment_where := ARRAY[]::text[];

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_id'
        ) THEN
            payment_where := payment_where || 'user_id IN (SELECT user_id FROM target_user_ids)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_email'
        ) THEN
            payment_where := payment_where || 'LOWER(user_email) IN (SELECT email FROM target_user_emails)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'client_email'
        ) THEN
            payment_where := payment_where || 'LOWER(client_email) IN (SELECT email FROM target_user_emails)';
        END IF;

        IF array_length(payment_where, 1) IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.payments WHERE ' || array_to_string(payment_where, ' OR ');
        END IF;
    END IF;

    IF to_regclass('public.keynote_registrations') IS NOT NULL THEN
        EXECUTE '
            DELETE FROM public.keynote_registrations
            WHERE LOWER(email) IN (SELECT email FROM target_user_emails)
        ';
    END IF;

    IF to_regclass('storage.objects') IS NOT NULL THEN
        EXECUTE '
            DELETE FROM storage.objects so
            USING target_user_ids ids
            WHERE so.bucket_id = ''avatars''
              AND so.name LIKE ids.user_id::text || ''/%''
        ';
    END IF;
END $$;

-- 4) Suppression des profils applicatifs puis des comptes Auth.
DELETE FROM public.users
WHERE id IN (SELECT user_id FROM target_user_ids)
   OR LOWER(email) IN (SELECT email FROM target_user_emails);

DELETE FROM auth.users
WHERE id IN (SELECT user_id FROM target_user_ids)
   OR LOWER(email) IN (SELECT email FROM target_user_emails);

-- 5) Verification finale: doit retourner 0 partout.
CREATE TEMP TABLE deletion_verification (
    table_name text NOT NULL,
    remaining bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO deletion_verification
SELECT 'auth.users', COUNT(*)
FROM auth.users
WHERE LOWER(email) IN (SELECT email FROM target_user_emails);

INSERT INTO deletion_verification
SELECT 'public.users', COUNT(*)
FROM public.users
WHERE LOWER(email) IN (SELECT email FROM target_user_emails);

DO $$
DECLARE
    n bigint;
    payment_where text[];
BEGIN
    IF to_regclass('public.payments') IS NOT NULL THEN
        payment_where := ARRAY[]::text[];

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_id'
        ) THEN
            payment_where := payment_where || 'user_id IN (SELECT user_id FROM target_user_ids)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_email'
        ) THEN
            payment_where := payment_where || 'LOWER(user_email) IN (SELECT email FROM target_user_emails)';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'client_email'
        ) THEN
            payment_where := payment_where || 'LOWER(client_email) IN (SELECT email FROM target_user_emails)';
        END IF;

        IF array_length(payment_where, 1) IS NOT NULL THEN
            EXECUTE 'SELECT COUNT(*) FROM public.payments WHERE ' || array_to_string(payment_where, ' OR ')
            INTO n;
            INSERT INTO deletion_verification VALUES ('public.payments', n);
        END IF;
    END IF;

    IF to_regclass('public.keynote_registrations') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM public.keynote_registrations
            WHERE LOWER(email) IN (SELECT email FROM target_user_emails)
        '
        INTO n;
        INSERT INTO deletion_verification VALUES ('public.keynote_registrations', n);
    END IF;

    IF to_regclass('storage.objects') IS NOT NULL THEN
        EXECUTE '
            SELECT COUNT(*)
            FROM storage.objects so
            JOIN target_user_ids ids ON so.name LIKE ids.user_id::text || ''/%''
            WHERE so.bucket_id = ''avatars''
        '
        INTO n;
        INSERT INTO deletion_verification VALUES ('storage.objects:avatars', n);
    END IF;
END $$;

SELECT *
FROM deletion_verification
ORDER BY table_name;

-- Si tout est OK:
COMMIT;
-- Sinon:
-- ROLLBACK;
