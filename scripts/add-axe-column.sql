-- Add axe column to campaigns table (text array for multiple axes)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS axe TEXT[] DEFAULT '{}';
