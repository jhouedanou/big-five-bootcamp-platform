-- Big Five Creative Library Platform - Schéma Supabase
-- À exécuter dans le SQL Editor de Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- NETTOYAGE: Supprimer les anciennes tables si elles existent
-- ==============================================

-- Supprimer les anciennes fonctions (cela supprime aussi les triggers associés)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_session_available_spots() CASCADE;

-- Supprimer les tables (CASCADE supprime les contraintes et triggers)
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS creative_libraries CASCADE;
DROP TABLE IF EXISTS "Creative Librarys" CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==============================================
-- PARTIE 1: SYSTÈME ADMIN (Users & Campaigns)
-- ==============================================

-- Table des utilisateurs (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  plan VARCHAR(50) NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des campagnes (content marketing)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  category VARCHAR(100),
  thumbnail VARCHAR(500),
  images TEXT[],
  video_url VARCHAR(500),
  platforms TEXT[],
  duration VARCHAR(100),
  target_audience TEXT,
  tags TEXT[],
  status VARCHAR(50) NOT NULL DEFAULT 'Brouillon' CHECK (status IN ('Publié', 'Brouillon', 'En attente')),
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  country VARCHAR(100),
  format VARCHAR(100),
  agency VARCHAR(255),
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- PARTIE 2: SYSTÈME Creative Library
-- ==============================================

-- Table des creative_libraries (thématiques)
CREATE TABLE IF NOT EXISTS creative_libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  level VARCHAR(50) NOT NULL CHECK (level IN ('Intermédiaire', 'Avancé')),
  duration VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  target_audience TEXT[] NOT NULL,
  prerequisites TEXT[] NOT NULL,
  objectives TEXT[] NOT NULL,
  program JSONB NOT NULL,
  methodology TEXT NOT NULL,
  trainer JSONB NOT NULL,
  faq JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creative_library_id UUID NOT NULL REFERENCES creative_libraries(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL CHECK (format IN ('Présentiel', 'Hybride')),
  trainer_name VARCHAR(255) NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  available_spots INTEGER NOT NULL DEFAULT 20,
  status VARCHAR(50) NOT NULL DEFAULT 'Ouvert' CHECK (status IN ('Ouvert', 'Complet', 'Annulé')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des inscriptions
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255),
  job_title VARCHAR(255),
  how_heard VARCHAR(255),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Card', 'Transfer', 'Quote')),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_sessions_creative_library_id ON sessions(creative_library_id);
CREATE INDEX idx_sessions_start_date ON sessions(start_date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_registrations_session_id ON registrations(session_id);
CREATE INDEX idx_registrations_user_email ON registrations(user_email);
CREATE INDEX idx_registrations_payment_status ON registrations(payment_status);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_creative_libraries_updated_at
  BEFORE UPDATE ON creative_libraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour users et campaigns
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour automatiquement available_spots
CREATE OR REPLACE FUNCTION update_session_available_spots()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sessions 
    SET available_spots = available_spots - 1,
        status = CASE 
          WHEN available_spots - 1 <= 0 THEN 'Complet'::VARCHAR
          ELSE status 
        END
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sessions 
    SET available_spots = available_spots + 1,
        status = CASE 
          WHEN available_spots + 1 > 0 THEN 'Ouvert'::VARCHAR
          ELSE status 
        END
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour available_spots
CREATE TRIGGER update_available_spots_on_registration
  AFTER INSERT OR DELETE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_session_available_spots();

-- Row Level Security (RLS) Policies

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES - USERS
-- ==============================================

-- Users peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Users peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins peuvent tout faire sur users
CREATE POLICY "Admins can manage all users" 
  ON public.users FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==============================================
-- RLS POLICIES - CAMPAIGNS
-- ==============================================

-- Tout le monde peut voir les campagnes publiées
CREATE POLICY "Published campaigns are viewable by everyone" 
  ON campaigns FOR SELECT 
  USING (status = 'Publié' OR author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Users authentifiés peuvent créer des campagnes
CREATE POLICY "Authenticated users can create campaigns" 
  ON campaigns FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users peuvent modifier leurs propres campagnes
CREATE POLICY "Users can update own campaigns" 
  ON campaigns FOR UPDATE 
  USING (author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Users peuvent supprimer leurs propres campagnes
CREATE POLICY "Users can delete own campaigns" 
  ON campaigns FOR DELETE 
  USING (author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==============================================
-- RLS POLICIES - CREATIVE_LIBRARIES & SESSIONS
-- ==============================================

-- creative_libraries: tout le monde peut lire
CREATE POLICY "creative_libraries are viewable by everyone" 
  ON creative_libraries FOR SELECT 
  USING (true);

-- Sessions: tout le monde peut lire
CREATE POLICY "Sessions are viewable by everyone" 
  ON sessions FOR SELECT 
  USING (true);

-- Registrations: les utilisateurs peuvent créer leurs propres inscriptions
CREATE POLICY "Users can create registrations" 
  ON registrations FOR INSERT 
  WITH CHECK (true);

-- Registrations: les utilisateurs peuvent voir leurs propres inscriptions
CREATE POLICY "Users can view own registrations" 
  ON registrations FOR SELECT 
  USING (user_email = auth.jwt() ->> 'email' OR auth.jwt() ->> 'role' = 'admin');

-- Données de démonstration

-- Insérer un creative_library exemple (Social Media Management)
INSERT INTO creative_libraries (
  slug,
  title,
  tagline,
  description,
  level,
  duration,
  price,
  target_audience,
  prerequisites,
  objectives,
  program,
  methodology,
  trainer,
  faq
) VALUES (
  'social-media-management-avance',
  'Social Media Management Avancé',
  'Passez de gestionnaire à stratège des réseaux sociaux',
  'Maîtrisez les stratégies avancées de gestion des réseaux sociaux, de la planification stratégique à l''analyse de performance. Ce Creative Library intensif vous transformera en expert capable de piloter une stratégie social media complète et mesurable.',
  'Avancé',
  '2 jours (14 heures)',
  450000,
  ARRAY['Social Media Managers expérimentés', 'Community Managers seniors', 'Responsables communication digitale', 'Consultants en marketing digital'],
  ARRAY['1 an d''expérience en gestion de réseaux sociaux', 'Maîtrise des plateformes principales (Facebook, Instagram, LinkedIn)', 'Connaissance des bases du marketing digital'],
  ARRAY[
    'Élaborer une stratégie social media alignée sur les objectifs business',
    'Maîtriser les techniques avancées de community management',
    'Analyser et optimiser les performances avec des KPIs pertinents',
    'Gérer des crises sur les réseaux sociaux',
    'Piloter des campagnes publicitaires social media ROI-positives'
  ],
  '{
    "day1": {
      "title": "Jour 1 : Stratégie et Planification Avancée",
      "modules": [
        {
          "title": "Audit stratégique social media",
          "duration": "2h",
          "topics": ["Analyse concurrentielle approfondie", "Identification des opportunités", "Benchmark des best practices"]
        },
        {
          "title": "Framework stratégique",
          "duration": "2h",
          "topics": ["Définition des objectifs SMART", "Personas et segmentation avancée", "Mapping du parcours client social"]
        },
        {
          "title": "Planification éditoriale avancée",
          "duration": "3h",
          "topics": ["Calendrier éditorial stratégique", "Formats de contenu innovants", "Automatisation intelligente", "Atelier pratique"]
        }
      ]
    },
    "day2": {
      "title": "Jour 2 : Analytics, Reporting et Optimisation",
      "modules": [
        {
          "title": "Analytics avancés",
          "duration": "2h",
          "topics": ["Mise en place de KPIs pertinents", "Attribution multi-touch", "Google Analytics 4 pour social media"]
        },
        {
          "title": "Social Media Advertising",
          "duration": "2h",
          "topics": ["Stratégies de ciblage avancées", "Optimisation des campagnes", "A/B testing et itération"]
        },
        {
          "title": "Reporting et gestion de crise",
          "duration": "3h",
          "topics": ["Création de dashboards exécutifs", "Storytelling avec la data", "Protocole de gestion de crise", "Cas pratiques réels"]
        }
      ]
    }
  }'::jsonb,
  'Notre approche privilégie la pratique (70%) sur la théorie (30%). Chaque module alterne entre présentation de concepts, démonstrations live et exercices pratiques sur des cas réels. Vous repartirez avec des templates, checklists et frameworks directement applicables.',
  '{
    "name": "Sarah Koné",
    "title": "Stratège Social Media Senior",
    "bio": "12 ans d''expérience en marketing digital, Sarah a piloté les stratégies social media de grandes marques panafricaines. Certifiée Meta Blueprint et Google Digital Marketing, elle forme des professionnels depuis 5 ans.",
    "expertise": ["Stratégie social media", "Community management", "Social media advertising", "Analytics et reporting"],
    "image": "/images/trainers/sarah-kone.jpg"
  }'::jsonb,
  '[
    {
      "question": "Quel niveau est requis pour ce Creative Library ?",
      "answer": "Ce Creative Library s''adresse à des professionnels ayant au minimum 1 an d''expérience en gestion de réseaux sociaux. Vous devez maîtriser les bases des principales plateformes."
    },
    {
      "question": "Recevrai-je un certificat ?",
      "answer": "Oui, un certificat de participation Big Five vous sera délivré à l''issue du Creative Library."
    },
    {
      "question": "Le matériel est-il fourni ?",
      "answer": "Vous devez venir avec votre ordinateur portable. Nous fournissons tous les supports de formation, templates et accès aux outils."
    },
    {
      "question": "Puis-je payer en plusieurs fois ?",
      "answer": "Oui, nous proposons un paiement en 2 fois sans frais pour les particuliers. Contactez-nous pour plus d''informations."
    }
  ]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Insérer des sessions exemple
INSERT INTO sessions (
  creative_library_id,
  start_date,
  end_date,
  location,
  city,
  format,
  trainer_name,
  max_capacity,
  available_spots
) 
SELECT 
  b.id,
  '2026-03-15'::date,
  '2026-03-16'::date,
  'Big Five Campus, Cocody',
  'Abidjan',
  'Présentiel',
  'Sarah Koné',
  20,
  20
FROM creative_libraries b
WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (
  creative_library_id,
  start_date,
  end_date,
  location,
  city,
  format,
  trainer_name,
  max_capacity,
  available_spots
) 
SELECT 
  b.id,
  '2026-04-20'::date,
  '2026-04-21'::date,
  'Big Five Campus, Cocody',
  'Abidjan',
  'Hybride',
  'Sarah Koné',
  25,
  25
FROM creative_libraries b
WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

-- Afficher les résultats
SELECT 'Schéma créé avec succès!' as message;
SELECT COUNT(*) as creative_libraries_count FROM creative_libraries;
SELECT COUNT(*) as sessions_count FROM sessions;

-- ==============================================
-- PARTIE 3: SYSTÈME DE PAIEMENT PAYTECH
-- ==============================================

-- Table des transactions PayTech
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Référence PayTech
  ref_command VARCHAR(255) UNIQUE NOT NULL, -- Référence unique générée pour PayTech
  paytech_token VARCHAR(255), -- Token retourné par PayTech
  
  -- Informations de paiement
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF',
  payment_method VARCHAR(100), -- Ex: "Orange Money", "Wave"
  client_phone VARCHAR(50),
  
  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed', 'canceled', 'refunded')),
  
  -- Relation avec session et utilisateur
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL, -- Email de l'utilisateur qui paie
  
  -- Détails de la transaction
  item_name VARCHAR(255) NOT NULL, -- Nom du bootcamp
  item_description TEXT,
  
  -- Données PayTech IPN
  ipn_data JSONB, -- Stocke toutes les données IPN reçues
  
  -- Promotions (si applicable)
  initial_amount DECIMAL(10, 2),
  final_amount DECIMAL(10, 2),
  promo_enabled BOOLEAN DEFAULT FALSE,
  promo_value_percent DECIMAL(5, 2),
  
  -- Environnement PayTech (test ou prod)
  env VARCHAR(10) DEFAULT 'test' CHECK (env IN ('test', 'prod')),
  
  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_payments_ref_command ON payments(ref_command);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_email ON payments(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paytech_token ON payments(paytech_token);

-- Trigger updated_at pour payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS pour payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres paiements
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  USING (user_email = auth.jwt()->>'email');

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seul le système (via service_role) peut créer/modifier les payments
CREATE POLICY "System can manage payments"
  ON payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- Fonction pour vérifier si un paiement est déjà effectué pour une session
CREATE OR REPLACE FUNCTION check_existing_payment(
  p_session_id UUID,
  p_user_email VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payments
    WHERE session_id = p_session_id
      AND user_email = p_user_email
      AND status IN ('completed', 'pending')
  );
END;
$$ LANGUAGE plpgsql;

-- Vue pour les statistiques de paiement
CREATE OR REPLACE VIEW payment_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
  SUM(final_amount) FILTER (WHERE status = 'completed') as total_revenue,
  AVG(final_amount) FILTER (WHERE status = 'completed') as average_transaction,
  COUNT(DISTINCT user_email) FILTER (WHERE status = 'completed') as unique_customers
FROM payments;

-- Mettre à jour la table registrations pour lier aux paiements
ALTER TABLE registrations 
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

-- Commentaires pour documentation
COMMENT ON TABLE payments IS 'Transactions PayTech pour les inscriptions aux bootcamps';
COMMENT ON COLUMN payments.ref_command IS 'Référence unique envoyée à PayTech (format: BOOTCAMP_timestamp_random)';
COMMENT ON COLUMN payments.paytech_token IS 'Token retourné par PayTech lors de la demande de paiement';
COMMENT ON COLUMN payments.ipn_data IS 'Données JSON complètes reçues via IPN (webhook PayTech)';
COMMENT ON COLUMN payments.status IS 'Statut: pending (en attente), completed (payé), failed (échoué), canceled (annulé), refunded (remboursé)';
