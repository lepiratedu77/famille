-- ============================================
-- CADARIO Family Hub - RLS Policy Fix Script
-- ============================================
-- 
-- Ce script corrige les politiques RLS qui bloquent
-- l'inscription des nouveaux utilisateurs.
--
-- INSTRUCTIONS:
-- 1. Ouvrez le SQL Editor de votre projet Supabase
-- 2. Copiez-collez ce script
-- 3. Exécutez-le
-- ============================================

-- ÉTAPE 1: Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Family_Access_Families" ON families;
DROP POLICY IF EXISTS "Family_Access_Profiles" ON profiles;
DROP POLICY IF EXISTS "Profile_Select_Own" ON profiles;
DROP POLICY IF EXISTS "Profile_Insert_Own" ON profiles;
DROP POLICY IF EXISTS "Profile_Update_Own" ON profiles;
DROP POLICY IF EXISTS "Family_Select" ON families;
DROP POLICY IF EXISTS "Family_Insert" ON families;

-- ÉTAPE 2: Créer les nouvelles politiques pour FAMILIES
-- Lecture: seuls les membres de la famille peuvent voir leur famille
CREATE POLICY "Family_Select" ON families FOR SELECT TO authenticated 
  USING (id IN (SELECT family_id FROM profiles WHERE profiles.id = auth.uid()));

-- Création: tout utilisateur authentifié peut créer une famille (pour le premier signup)
CREATE POLICY "Family_Insert" ON families FOR INSERT TO authenticated 
  WITH CHECK (true);

-- ÉTAPE 3: Créer les nouvelles politiques pour PROFILES
-- Lecture: son propre profil + les membres de sa famille
CREATE POLICY "Profile_Select_Own" ON profiles FOR SELECT TO authenticated 
  USING (id = auth.uid() OR family_id IN (SELECT family_id FROM profiles WHERE profiles.id = auth.uid()));

-- Création: uniquement son propre profil (avec son propre auth.uid())
CREATE POLICY "Profile_Insert_Own" ON profiles FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid());

-- Mise à jour: uniquement son propre profil
CREATE POLICY "Profile_Update_Own" ON profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid());

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Après exécution, les inscriptions devraient fonctionner !
