-- ============================================
-- CADARIO Family Hub - Add Avatar URL Column
-- ============================================
-- 
-- Ajoute la colonne avatar_url pour les avatars de profil
--
-- INSTRUCTIONS:
-- 1. Ouvrez le SQL Editor de votre projet Supabase
-- 2. Copiez-collez CE SCRIPT EN ENTIER
-- 3. Exécutez-le
-- ============================================

-- Ajouter avatar_url à profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '/avatars/lion.png';

-- Vérification
SELECT id, full_name, avatar_url FROM profiles LIMIT 5;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
