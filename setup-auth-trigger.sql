-- ============================================
-- CADARIO Family Hub - Auto Profile Creation
-- ============================================
-- 
-- Ce script crée un TRIGGER qui s'exécute automatiquement
-- quand un nouvel utilisateur s'inscrit via Supabase Auth.
-- Il crée automatiquement :
-- 1. Une famille par défaut (si elle n'existe pas)
-- 2. Le profil de l'utilisateur
--
-- AVANTAGE: Le trigger s'exécute avec des privilèges élevés,
-- donc il bypass les politiques RLS !
--
-- INSTRUCTIONS:
-- 1. Ouvrez le SQL Editor de votre projet Supabase
-- 2. Copiez-collez CE SCRIPT EN ENTIER
-- 3. Exécutez-le
-- ============================================

-- ÉTAPE 1: Créer une famille par défaut si elle n'existe pas
INSERT INTO families (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Famille CADARIO')
ON CONFLICT (id) DO NOTHING;

-- ÉTAPE 2: Créer la fonction qui s'exécutera à chaque inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- ⚠️ IMPORTANT: Ceci permet de bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Créer le profil automatiquement
  INSERT INTO public.profiles (id, family_id, full_name, color_code, role, points)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001', -- Famille CADARIO par défaut
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouveau Membre'),
    COALESCE(NEW.raw_user_meta_data->>'color_code', '#8b5cf6'),
    'member',
    0
  );
  RETURN NEW;
END;
$$;

-- ÉTAPE 3: Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ÉTAPE 4: Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Maintenant, quand quelqu'un s'inscrit :
-- 1. Supabase Auth crée l'utilisateur
-- 2. Le trigger crée automatiquement son profil
-- 3. L'utilisateur est immédiatement prêt à utiliser l'app !
