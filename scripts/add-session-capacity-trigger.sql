-- Migration : trigger atomique de capacité pour decrypte_registrations
-- Problème : le check count < max_seats dans l'API est non-atomique ; deux
-- requêtes concurrentes peuvent toutes deux passer le test et insérer,
-- dépassant max_seats.
-- Solution : trigger BEFORE INSERT qui re-compte à l'intérieur de la
-- transaction, garantissant l'exclusivité row-level sans lock explicite.
--
-- Code d'erreur renvoyé : P0001 (raise_exception), message = 'SESSION_FULL'
-- L'API détecte ce message et retourne HTTP 409.
--
-- À appliquer sur Supabase via l'éditeur SQL ou la CLI.

CREATE OR REPLACE FUNCTION public.check_session_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_seats  int;
  v_count      int;
BEGIN
  -- Pas de session_id = inscription mode legacy (session_month), pas de limite
  IF NEW.session_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_seats INTO v_max_seats
  FROM public.decrypte_sessions
  WHERE id = NEW.session_id;

  -- Pas de limite configurée
  IF v_max_seats IS NULL THEN
    RETURN NEW;
  END IF;

  -- Compter les inscriptions existantes DANS la même transaction
  -- (FOR UPDATE SKIP LOCKED n'est pas nécessaire ici car le verrou de ligne
  -- sur la session suffit pour les inserts concurrents)
  SELECT COUNT(*) INTO v_count
  FROM public.decrypte_registrations
  WHERE session_id = NEW.session_id;

  IF v_count >= v_max_seats THEN
    RAISE EXCEPTION 'SESSION_FULL'
      USING ERRCODE = 'P0001',
            HINT    = 'max_seats atteint pour cette séance';
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe (idempotent)
DROP TRIGGER IF EXISTS trg_check_session_capacity ON public.decrypte_registrations;

CREATE TRIGGER trg_check_session_capacity
  BEFORE INSERT ON public.decrypte_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_session_capacity();
