-- Clé de licence Chariow/Moneroo renvoyée au paiement, persistée sur le
-- profil pour affichage dans l'espace utilisateur.
-- Run in Supabase SQL Editor.

alter table users add column if not exists license_key text;

notify pgrst, 'reload schema';
