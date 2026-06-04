-- =============================================================================
-- Renseigne les product_id Chariow dédiés (prix promo 10 000 FCFA).
-- Idempotent : à exécuter si le seed de 20260605_promo.sql a déjà tourné
-- avec payment_product_id = null.
-- Basic 3 mois : https://xswgzpho.mychariow.shop/prd_9ya1w161
-- Pro   2 mois : https://xswgzpho.mychariow.shop/prd_51tfnkip
-- =============================================================================

update public.promo_offers
set payment_product_id = 'prd_9ya1w161'
where plan_type = 'basic' and duration_months = 3 and payment_product_id is null;

update public.promo_offers
set payment_product_id = 'prd_51tfnkip'
where plan_type = 'pro' and duration_months = 2 and payment_product_id is null;
