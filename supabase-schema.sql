-- Big Five Bootcamp Platform - Schéma Supabase
-- À exécuter dans le SQL Editor de Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des bootcamps (thématiques)
CREATE TABLE IF NOT EXISTS bootcamps (
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
  bootcamp_id UUID NOT NULL REFERENCES bootcamps(id) ON DELETE CASCADE,
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
CREATE INDEX idx_sessions_bootcamp_id ON sessions(bootcamp_id);
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
CREATE TRIGGER update_bootcamps_updated_at
  BEFORE UPDATE ON bootcamps
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
ALTER TABLE bootcamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Bootcamps: tout le monde peut lire
CREATE POLICY "Bootcamps are viewable by everyone" 
  ON bootcamps FOR SELECT 
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

-- Insérer un bootcamp exemple (Social Media Management)
INSERT INTO bootcamps (
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
  'Maîtrisez les stratégies avancées de gestion des réseaux sociaux, de la planification stratégique à l''analyse de performance. Ce bootcamp intensif vous transformera en expert capable de piloter une stratégie social media complète et mesurable.',
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
      "question": "Quel niveau est requis pour ce bootcamp ?",
      "answer": "Ce bootcamp s''adresse à des professionnels ayant au minimum 1 an d''expérience en gestion de réseaux sociaux. Vous devez maîtriser les bases des principales plateformes."
    },
    {
      "question": "Recevrai-je un certificat ?",
      "answer": "Oui, un certificat de participation Big Five vous sera délivré à l''issue du bootcamp."
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
  bootcamp_id,
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
FROM bootcamps b
WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (
  bootcamp_id,
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
FROM bootcamps b
WHERE b.slug = 'social-media-management-avance'
ON CONFLICT DO NOTHING;

-- Afficher les résultats
SELECT 'Schéma créé avec succès!' as message;
SELECT COUNT(*) as bootcamps_count FROM bootcamps;
SELECT COUNT(*) as sessions_count FROM sessions;
