-- ============================================
-- CADARIO Family Hub - Add Missing Columns
-- ============================================
-- 
-- Certaines tables manquent de colonnes `created_at`.
-- Ce script les ajoute.
--
-- INSTRUCTIONS:
-- 1. Ouvrez le SQL Editor de votre projet Supabase
-- 2. Copiez-collez CE SCRIPT EN ENTIER
-- 3. Exécutez-le
-- ============================================

-- Ajouter created_at à shopping_items
ALTER TABLE shopping_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Ajouter created_at à karma_logs (au cas où)
ALTER TABLE karma_logs 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Ajouter created_at à profiles (au cas où)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================
-- FIN DU SCRIPT
-- ============================================
