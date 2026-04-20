-- Migration : refonte des brand_requests
--   * social_networks (facebook, instagram, linkedin, x, tiktok)
--   * brand_urls (plusieurs liens, champ requis côté app)
-- À exécuter dans le SQL Editor de Supabase.

ALTER TABLE brand_requests
  ADD COLUMN IF NOT EXISTS social_networks TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS brand_urls      TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- Contrainte : valeurs autorisées dans social_networks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_requests_social_networks_check') THEN
    ALTER TABLE brand_requests
      ADD CONSTRAINT brand_requests_social_networks_check
      CHECK (social_networks <@ ARRAY['facebook','instagram','linkedin','x','tiktok']::TEXT[]);
  END IF;
END $$;

-- Migration brand_url -> brand_urls[]
UPDATE brand_requests
   SET brand_urls = ARRAY[brand_url]
 WHERE brand_url IS NOT NULL
   AND brand_url <> ''
   AND (brand_urls IS NULL OR array_length(brand_urls, 1) IS NULL);

-- Index GIN pour filtrage par réseau
CREATE INDEX IF NOT EXISTS idx_brand_requests_social_networks
  ON brand_requests USING GIN (social_networks);
