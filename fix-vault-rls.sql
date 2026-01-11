-- Script de réparation des politiques RLS pour vault_items
-- Exécuter dans Supabase SQL Editor

-- 1. Vérifier et créer la colonne owner_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vault_items' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE vault_items ADD COLUMN owner_id UUID REFERENCES profiles(id);
    END IF;
END $$;

-- 2. Supprimer TOUTES les anciennes politiques RLS sur vault_items
DROP POLICY IF EXISTS "Vault_Admin_Access" ON vault_items;
DROP POLICY IF EXISTS "Vault_Member_View" ON vault_items;
DROP POLICY IF EXISTS "Vault_Owner_All" ON vault_items;
DROP POLICY IF EXISTS "Vault_Shared_View" ON vault_items;

-- 3. Créer des politiques RLS simples et fonctionnelles

-- Politique SELECT: Propriétaire peut voir ses items OU items de sa famille
CREATE POLICY "vault_select_policy" ON vault_items 
FOR SELECT TO authenticated 
USING (
    owner_id = auth.uid() 
    OR 
    family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
);

-- Politique INSERT: Utilisateur peut créer ses propres items
CREATE POLICY "vault_insert_policy" ON vault_items 
FOR INSERT TO authenticated 
WITH CHECK (owner_id = auth.uid());

-- Politique UPDATE: Propriétaire peut modifier ses items
CREATE POLICY "vault_update_policy" ON vault_items 
FOR UPDATE TO authenticated 
USING (owner_id = auth.uid());

-- Politique DELETE: Propriétaire peut supprimer ses items
CREATE POLICY "vault_delete_policy" ON vault_items 
FOR DELETE TO authenticated 
USING (owner_id = auth.uid());

-- 4. Créer la table vault_shares si elle n'existe pas
CREATE TABLE IF NOT EXISTS vault_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS sur vault_shares
ALTER TABLE vault_shares ENABLE ROW LEVEL SECURITY;

-- 5. Politiques pour vault_shares
DROP POLICY IF EXISTS "Vault_Shares_Owner_All" ON vault_shares;
DROP POLICY IF EXISTS "Vault_Shares_Member_View" ON vault_shares;

-- Propriétaire de l'item peut gérer les partages
CREATE POLICY "vault_shares_owner_policy" ON vault_shares
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM vault_items 
        WHERE vault_items.id = vault_shares.vault_item_id 
        AND vault_items.owner_id = auth.uid()
    )
);

-- Utilisateur peut voir les partages qui le concernent
CREATE POLICY "vault_shares_recipient_policy" ON vault_shares
FOR SELECT TO authenticated
USING (shared_with = auth.uid());

-- 6. Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Politiques RLS réparées avec succès!';
END $$;
