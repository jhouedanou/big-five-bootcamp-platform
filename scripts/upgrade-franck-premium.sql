-- Passer franck@bigfiveabidjan.com en Premium
-- À exécuter dans le SQL Editor de Supabase

UPDATE users
SET plan = 'Premium',
    subscription_status = 'active',
    subscription_end_date = '2027-04-02T00:00:00Z'
WHERE email = 'franck@bigfiveabidjan.com';

-- Vérification
SELECT id, email, name, plan, subscription_status, subscription_end_date
FROM users
WHERE email = 'franck@bigfiveabidjan.com';
