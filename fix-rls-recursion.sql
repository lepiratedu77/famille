-- ============================================
-- CADARIO Family Hub - Fix RLS Recursion
-- ============================================
-- 
-- Le problème: Les politiques RLS sur `profiles` causent
-- une récursion infinie (erreur 500).
--
-- Solution: Simplifier les politiques pour éviter
-- les sous-requêtes récursives.
--
-- INSTRUCTIONS:
-- 1. Ouvrez le SQL Editor de votre projet Supabase
-- 2. Copiez-collez CE SCRIPT EN ENTIER
-- 3. Exécutez-le
-- ============================================

-- ÉTAPE 1: Supprimer TOUTES les anciennes politiques sur profiles
DROP POLICY IF EXISTS "Profile_Select_Own" ON profiles;
DROP POLICY IF EXISTS "Profile_Insert_Own" ON profiles;
DROP POLICY IF EXISTS "Profile_Update_Own" ON profiles;
DROP POLICY IF EXISTS "Family_Access_Profiles" ON profiles;

-- ÉTAPE 2: Créer des politiques SIMPLES sans récursion

-- Lecture: Tout utilisateur authentifié peut lire son propre profil
CREATE POLICY "profiles_select_own" ON profiles 
  FOR SELECT TO authenticated 
  USING (id = auth.uid());

-- Lecture: Les membres de la même famille peuvent se voir
-- On utilise une fonction pour éviter la récursion
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$;

CREATE POLICY "profiles_select_family" ON profiles 
  FOR SELECT TO authenticated 
  USING (family_id = get_my_family_id());

-- Insertion: Seulement son propre profil
CREATE POLICY "profiles_insert_own" ON profiles 
  FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid());

-- Mise à jour: Seulement son propre profil
CREATE POLICY "profiles_update_own" ON profiles 
  FOR UPDATE TO authenticated 
  USING (id = auth.uid());

-- ============================================
-- ÉTAPE 3: Vérifier que le profil existe
-- ============================================

-- Afficher les profils existants (pour debug)
SELECT id, family_id, full_name, role FROM profiles;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
