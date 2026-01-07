-- 1. Mise à jour de la table vault_items
-- Ajouter owner_id pour identifier à qui appartient le secret
ALTER TABLE vault_items ADD COLUMN owner_id UUID REFERENCES profiles(id);

-- Assigner les secrets existants à l'admin de la famille (par défaut)
UPDATE vault_items 
SET owner_id = p.id
FROM profiles p
WHERE vault_items.family_id = p.family_id 
AND p.role = 'admin'
AND vault_items.owner_id IS NULL;

-- 2. Création de la table de partage
CREATE TABLE vault_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES profiles(id), -- NULL = partagé avec toute la famille (optionnel selon implémentation)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS sur vault_shares
ALTER TABLE vault_shares ENABLE ROW LEVEL SECURITY;

-- 3. Mise à jour des politiques RLS pour vault_items
DROP POLICY IF EXISTS "Vault_Admin_Access" ON vault_items;
DROP POLICY IF EXISTS "Vault_Member_View" ON vault_items;

-- Propriétaire : Accès total
CREATE POLICY "Vault_Owner_All" ON vault_items 
FOR ALL TO authenticated 
USING (owner_id = auth.uid());

-- Partagé : Lecture seule si présent dans vault_shares
CREATE POLICY "Vault_Shared_View" ON vault_items 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM vault_shares 
    WHERE vault_shares.vault_item_id = vault_items.id 
    AND (vault_shares.shared_with = auth.uid() OR vault_shares.shared_with IS NULL)
  )
);

-- Politiques pour vault_shares
CREATE POLICY "Vault_Shares_Owner_All" ON vault_shares
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vault_items 
    WHERE vault_items.id = vault_shares.vault_item_id 
    AND vault_items.owner_id = auth.uid()
  )
);

CREATE POLICY "Vault_Shares_Member_View" ON vault_shares
FOR SELECT TO authenticated
USING (shared_with = auth.uid() OR shared_with IS NULL);
