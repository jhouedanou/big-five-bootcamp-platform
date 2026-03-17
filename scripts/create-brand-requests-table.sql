-- Migration: Table des demandes de collecte par marque (Agency plan)
-- À exécuter dans le SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS brand_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_url TEXT,
  brand_country TEXT,
  brand_sector TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_brand_requests_user_id ON brand_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_requests_status ON brand_requests(status);

-- RLS
ALTER TABLE brand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand requests" ON brand_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create brand requests" ON brand_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can see all (via service role key, bypasses RLS)
