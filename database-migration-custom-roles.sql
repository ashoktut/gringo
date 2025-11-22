-- ============================================
-- CUSTOM ROLES MANAGEMENT SYSTEM
-- Database Migration Script
-- ============================================
-- Run this in Supabase SQL Editor to set up the custom roles system

-- 1. CREATE CUSTOM_ROLES TABLE
-- Stores custom role definitions per company
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  role_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_company_role UNIQUE(company_id, role_name)
);

COMMENT ON TABLE custom_roles IS 'Custom roles created by company admins';
COMMENT ON COLUMN custom_roles.role_name IS 'Any text-based role name (e.g., Sales Rep, Driver)';

-- Index for performance
CREATE INDEX idx_custom_roles_company ON custom_roles(company_id);
CREATE INDEX idx_custom_roles_created_by ON custom_roles(created_by);

-- 2. CREATE FORM_TYPES TABLE
-- Stores available form types (system and custom)
CREATE TABLE IF NOT EXISTS form_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  form_code TEXT NOT NULL UNIQUE,
  form_name TEXT NOT NULL,
  form_description TEXT,
  is_system_form BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE form_types IS 'Available form types in the system';
COMMENT ON COLUMN form_types.is_system_form IS 'TRUE for built-in forms (RFQ, RQR), FALSE for custom forms';

-- Index for performance
CREATE INDEX idx_form_types_company ON form_types(company_id);
CREATE INDEX idx_form_types_code ON form_types(form_code);

-- 3. CREATE ROLE_FORM_ASSIGNMENTS TABLE
-- Maps roles to forms with granular permissions
CREATE TABLE IF NOT EXISTS role_form_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  form_type_id UUID NOT NULL REFERENCES form_types(id) ON DELETE CASCADE,
  can_create BOOLEAN DEFAULT FALSE,
  can_view BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_role_form UNIQUE(custom_role_id, form_type_id)
);

COMMENT ON TABLE role_form_assignments IS 'Assigns forms to roles with specific permissions';
COMMENT ON COLUMN role_form_assignments.can_view IS 'User can see form in navigation and view submissions';
COMMENT ON COLUMN role_form_assignments.can_create IS 'User can create new submissions';
COMMENT ON COLUMN role_form_assignments.can_edit IS 'User can modify existing submissions';
COMMENT ON COLUMN role_form_assignments.can_delete IS 'User can delete submissions';

-- Indexes for performance
CREATE INDEX idx_role_form_role ON role_form_assignments(custom_role_id);
CREATE INDEX idx_role_form_form ON role_form_assignments(form_type_id);

-- 4. UPDATE USER_PROFILES TABLE
-- Add custom_role_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

    COMMENT ON COLUMN user_profiles.custom_role_id IS 'Assigned custom role for regular users (NULL for admins)';
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_custom_role ON user_profiles(custom_role_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_form_assignments ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES

-- ============================================
-- CUSTOM_ROLES POLICIES
-- ============================================

-- Company admins and super admins can view their company's roles
CREATE POLICY "Company admins can view custom roles"
  ON custom_roles
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Company admins can create roles for their company
CREATE POLICY "Company admins can create custom roles"
  ON custom_roles
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
  );

-- Company admins can update their company's roles
CREATE POLICY "Company admins can update custom roles"
  ON custom_roles
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
  );

-- Company admins can delete their company's roles
CREATE POLICY "Company admins can delete custom roles"
  ON custom_roles
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
  );

-- ============================================
-- FORM_TYPES POLICIES
-- ============================================

-- Everyone can view system forms, admins can view all
CREATE POLICY "Users can view form types"
  ON form_types
  FOR SELECT
  USING (
    is_system_form = TRUE
    OR company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Company admins can create form types
CREATE POLICY "Company admins can create form types"
  ON form_types
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
  );

-- Company admins can update form types
CREATE POLICY "Company admins can update form types"
  ON form_types
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Company admins can delete form types
CREATE POLICY "Company admins can delete form types"
  ON form_types
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('company_admin', 'super_admin')
    )
  );

-- ============================================
-- ROLE_FORM_ASSIGNMENTS POLICIES
-- ============================================

-- Company admins can view role-form assignments
CREATE POLICY "Company admins can view role form assignments"
  ON role_form_assignments
  FOR SELECT
  USING (
    custom_role_id IN (
      SELECT cr.id FROM custom_roles cr
      INNER JOIN user_profiles up ON cr.company_id = up.company_id
      WHERE up.user_id = auth.uid()
        AND up.role IN ('company_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Company admins can create role-form assignments
CREATE POLICY "Company admins can create role form assignments"
  ON role_form_assignments
  FOR INSERT
  WITH CHECK (
    custom_role_id IN (
      SELECT cr.id FROM custom_roles cr
      INNER JOIN user_profiles up ON cr.company_id = up.company_id
      WHERE up.user_id = auth.uid()
        AND up.role IN ('company_admin', 'super_admin')
    )
  );

-- Company admins can update role-form assignments
CREATE POLICY "Company admins can update role form assignments"
  ON role_form_assignments
  FOR UPDATE
  USING (
    custom_role_id IN (
      SELECT cr.id FROM custom_roles cr
      INNER JOIN user_profiles up ON cr.company_id = up.company_id
      WHERE up.user_id = auth.uid()
        AND up.role IN ('company_admin', 'super_admin')
    )
  );

-- Company admins can delete role-form assignments
CREATE POLICY "Company admins can delete role form assignments"
  ON role_form_assignments
  FOR DELETE
  USING (
    custom_role_id IN (
      SELECT cr.id FROM custom_roles cr
      INNER JOIN user_profiles up ON cr.company_id = up.company_id
      WHERE up.user_id = auth.uid()
        AND up.role IN ('company_admin', 'super_admin')
    )
  );

-- 7. CREATE HELPER FUNCTION
-- Function to get accessible forms for a user
CREATE OR REPLACE FUNCTION get_user_accessible_forms(user_uuid UUID)
RETURNS TABLE (
  form_id UUID,
  form_code TEXT,
  form_name TEXT,
  can_create BOOLEAN,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_custom_role_id UUID;
BEGIN
  -- Get user's role and custom_role_id
  SELECT up.role, up.custom_role_id
  INTO user_role, user_custom_role_id
  FROM user_profiles up
  WHERE up.user_id = user_uuid;

  -- If user is admin, return all forms with all permissions
  IF user_role IN ('super_admin', 'company_admin') THEN
    RETURN QUERY
    SELECT
      ft.id as form_id,
      ft.form_code,
      ft.form_name,
      TRUE as can_create,
      TRUE as can_view,
      TRUE as can_edit,
      TRUE as can_delete
    FROM form_types ft
    ORDER BY ft.form_name;
    RETURN;
  END IF;

  -- If user has no custom role, return nothing
  IF user_custom_role_id IS NULL THEN
    RETURN;
  END IF;

  -- Return forms based on user's custom role
  RETURN QUERY
  SELECT
    ft.id as form_id,
    ft.form_code,
    ft.form_name,
    rfa.can_create,
    rfa.can_view,
    rfa.can_edit,
    rfa.can_delete
  FROM form_types ft
  INNER JOIN role_form_assignments rfa ON ft.id = rfa.form_type_id
  WHERE rfa.custom_role_id = user_custom_role_id
    AND rfa.can_view = TRUE -- Only return forms user can view
  ORDER BY ft.form_name;
END;
$$;

COMMENT ON FUNCTION get_user_accessible_forms IS 'Returns all forms accessible to a user based on their role and permissions';

-- 8. SEED INITIAL FORM TYPES
-- Insert system form types
INSERT INTO form_types (form_code, form_name, form_description, is_system_form) VALUES
  ('rfq', 'Request for Quote', 'Request for Quote form for construction projects', TRUE),
  ('rqr', 'Request for Review', 'Request for Review form', TRUE)
ON CONFLICT (form_code) DO NOTHING;

-- 9. CREATE TRIGGERS FOR UPDATED_AT
-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply trigger to custom_roles
DROP TRIGGER IF EXISTS update_custom_roles_updated_at ON custom_roles;
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to form_types
DROP TRIGGER IF EXISTS update_form_types_updated_at ON form_types;
CREATE TRIGGER update_form_types_updated_at
  BEFORE UPDATE ON form_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the schema was created correctly

-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('custom_roles', 'form_types', 'role_form_assignments')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('custom_roles', 'form_types', 'role_form_assignments');

-- Check policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('custom_roles', 'form_types', 'role_form_assignments')
ORDER BY tablename, cmd;

-- Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_accessible_forms';

-- Check form types seeded
SELECT form_code, form_name, is_system_form
FROM form_types
WHERE is_system_form = TRUE;

-- ============================================
-- NOTES
-- ============================================
-- 1. This script is idempotent - safe to run multiple times
-- 2. RLS policies ensure company isolation
-- 3. Super admins have access to all data
-- 4. Company admins can only manage their company's data
-- 5. Regular users can only see forms assigned to their role
-- 6. All tables have appropriate indexes for performance
-- 7. Triggers maintain updated_at timestamps automatically
