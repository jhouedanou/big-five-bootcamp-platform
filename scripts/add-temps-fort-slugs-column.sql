-- Associe une campagne à un ou plusieurs « Temps forts » (Coupe du monde, Ramadan, etc.)
-- Les valeurs sont les `slug` définis dans lib/temps-forts.ts
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS temps_fort_slugs text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS campaigns_temps_fort_slugs_idx
  ON campaigns USING GIN (temps_fort_slugs);
