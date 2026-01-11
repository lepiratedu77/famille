-- =====================================================
-- TABLE: Raccourcis Express de la Famille
-- À exécuter dans l'éditeur SQL de Supabase
-- =====================================================

CREATE TABLE IF NOT EXISTS family_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  slot INTEGER NOT NULL CHECK (slot >= 1 AND slot <= 4),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'KeyRound',
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, slot)
);

-- Enable RLS
ALTER TABLE family_shortcuts ENABLE ROW LEVEL SECURITY;

-- Policy: Family members can read/write their shortcuts
CREATE POLICY "Family_Access_Shortcuts" ON family_shortcuts FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- Insert default shortcuts for existing families
INSERT INTO family_shortcuts (family_id, slot, label, value, icon, color)
SELECT 
  id as family_id,
  1 as slot,
  'Wi-Fi' as label,
  'MOTDEPASSE_WIFI' as value,
  'Wifi' as icon,
  'blue' as color
FROM families
ON CONFLICT (family_id, slot) DO NOTHING;

INSERT INTO family_shortcuts (family_id, slot, label, value, icon, color)
SELECT 
  id as family_id,
  2 as slot,
  'Code' as label,
  '1234A' as value,
  'KeyRound' as icon,
  'emerald' as color
FROM families
ON CONFLICT (family_id, slot) DO NOTHING;

INSERT INTO family_shortcuts (family_id, slot, label, value, icon, color)
SELECT 
  id as family_id,
  3 as slot,
  'Papiers' as label,
  'vault' as value,
  'FileText' as icon,
  'violet' as color
FROM families
ON CONFLICT (family_id, slot) DO NOTHING;

INSERT INTO family_shortcuts (family_id, slot, label, value, icon, color)
SELECT 
  id as family_id,
  4 as slot,
  '+Course' as label,
  'shopping' as value,
  'ShoppingCart' as icon,
  'orange' as color
FROM families
ON CONFLICT (family_id, slot) DO NOTHING;
