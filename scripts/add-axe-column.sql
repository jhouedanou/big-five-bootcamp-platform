-- Add axe column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS axe VARCHAR(255);
