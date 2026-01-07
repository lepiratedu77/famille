-- 1. Create Families Table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Profiles Table (Linked to Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  family_id UUID REFERENCES families(id),
  role TEXT CHECK (role IN ('admin', 'member')),
  full_name TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  color_code TEXT DEFAULT '#8b5cf6',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Shopping Items
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  name TEXT NOT NULL,
  category TEXT,
  is_favorite BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('needed', 'bought')) DEFAULT 'needed',
  added_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Karma Logs (Activity tracking)
CREATE TABLE karma_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  family_id UUID REFERENCES families(id),
  task_description TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Secure Vault (Metadata only)
CREATE TABLE vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  title TEXT NOT NULL,
  description_encrypted TEXT, -- Client-side encrypted
  file_path TEXT,
  is_locked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Karma Tasks (Presets)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  title TEXT NOT NULL,
  points INTEGER NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Digital Fridge (Notes/Photos)
CREATE TABLE fridge_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  profile_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',
  type TEXT CHECK (type IN ('note', 'photo')) DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Express Polls
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  profile_id UUID REFERENCES profiles(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, profile_id)
);

-- 9. Family Calendar (Events)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  profile_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  category TEXT DEFAULT 'Général',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- FAMILIES: Allow authenticated users to read their family and create new ones
CREATE POLICY "Family_Select" ON families FOR SELECT TO authenticated 
  USING (id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Family_Insert" ON families FOR INSERT TO authenticated 
  WITH CHECK (true); -- Any authenticated user can create a family

-- PROFILES: Allow users to manage their own profile and view family members
CREATE POLICY "Profile_Select_Own" ON profiles FOR SELECT TO authenticated 
  USING (id = auth.uid() OR family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Profile_Insert_Own" ON profiles FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid()); -- Users can only create their own profile

CREATE POLICY "Profile_Update_Own" ON profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid()); -- Users can only update their own profile

-- SHOPPING ITEMS
CREATE POLICY "Family_Access_Shopping" ON shopping_items FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- KARMA LOGS
CREATE POLICY "Family_Access_Karma_Logs" ON karma_logs FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- TASKS
CREATE POLICY "Family_Access_Tasks" ON tasks FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- FRIDGE NOTES
CREATE POLICY "Family_Access_Fridge" ON fridge_notes FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- POLLS
CREATE POLICY "Family_Access_Polls" ON polls FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Family_Access_Poll_Votes" ON poll_votes FOR ALL TO authenticated 
  USING (poll_id IN (SELECT id FROM polls WHERE family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())));

-- EVENTS
CREATE POLICY "Family_Access_Events" ON events FOR ALL TO authenticated 
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- VAULT (Restricted: Admin full access, Member read-only)
CREATE POLICY "Vault_Admin_Access" ON vault_items FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.family_id = vault_items.family_id));

CREATE POLICY "Vault_Member_View" ON vault_items FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.family_id = vault_items.family_id));
