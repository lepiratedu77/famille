-- =====================================================
-- SCRIPT: Créer automatiquement les profils utilisateurs
-- À exécuter dans l'éditeur SQL de Supabase
-- =====================================================

-- 1. Créer la fonction qui sera appelée par le trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, family_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'member',
    '00000000-0000-0000-0000-000000000001'  -- <-- VOTRE family_id ici
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger qui appelle la fonction après chaque inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. BONUS: Créer les profils manquants pour les utilisateurs existants
-- (Lou, Mathis, Caroline qui n'ont pas encore de profil)
INSERT INTO public.profiles (id, full_name, role, family_id)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
  'member',
  '00000000-0000-0000-0000-000000000001'  -- <-- VOTRE family_id ici
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
