-- =============================================================================
-- Studio publicitaire — kit créatif accompagnant chaque génération
--
-- En plus de l'image, chaque génération livre :
--   - chatgpt_prompt : le prompt complet, prêt à coller dans ChatGPT (ou tout
--     autre générateur) pour reproduire ou retravailler le visuel ailleurs ;
--   - text_intent : l'intention de texte, en jsonb
--     { "accroche": "...", "texte_secondaire": "...", "cta": "..." }.
--
-- Autonome : dépend uniquement de la table ad_generations (migration 15).
-- =============================================================================

alter table public.ad_generations add column if not exists chatgpt_prompt text;
alter table public.ad_generations add column if not exists text_intent    jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ad_generations_text_intent_is_object') then
    alter table public.ad_generations add constraint ad_generations_text_intent_is_object
      check (text_intent is null or jsonb_typeof(text_intent) = 'object');
  end if;
end $$;

-- Vérification post-migration (SQL Editor)
--   select column_name from information_schema.columns
--   where table_name = 'ad_generations' and column_name in ('chatgpt_prompt','text_intent');
