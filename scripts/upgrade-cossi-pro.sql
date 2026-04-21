-- Passer cossi@bigfiveabidjan.com en Pro
-- À exécuter dans le SQL Editor de Supabase

UPDATE users
SET plan = 'Pro',
    subscription_status = 'active',
    subscription_end_date = '2027-04-21T00:00:00Z'
WHERE email = 'cossi@bigfiveabidjan.com';

-- Vérification
SELECT id, email, name, plan, subscription_status, subscription_end_date
FROM users
WHERE email = 'cossi@bigfiveabidjan.com';
