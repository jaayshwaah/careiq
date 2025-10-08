-- Safe fix for user_role enum - handles existing policies
-- This drops dependent policies, fixes the enum, then recreates policies

-- Step 1: Drop all policies that depend on the role column
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Find and drop all policies on tables that reference profiles.role
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE definition LIKE '%profiles%role%' OR definition LIKE '%role%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- Step 2: Convert role column to text
ALTER TABLE profiles ALTER COLUMN role TYPE text;

-- Step 3: Drop old enum type
DROP TYPE IF EXISTS user_role CASCADE;

-- Step 4: Create new enum with all needed values
CREATE TYPE user_role AS ENUM (
    'staff',
    'nurse',
    'admin',
    'administrator',
    'manager',
    'director',
    'super_admin'
);

-- Step 5: Convert back to enum (this will work because all existing values should map)
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role 
USING role::user_role;

-- Step 6: Recreate essential RLS policies with proper role checks
-- Using is_admin column instead of role string for better reliability

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Admin policies (using is_admin instead of role)
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);

-- Facilities policies (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facilities') THEN
        -- Drop old facilities policies
        DROP POLICY IF EXISTS facilities_select_all ON facilities;
        DROP POLICY IF EXISTS facilities_insert_admin ON facilities;
        DROP POLICY IF EXISTS facilities_update_admin ON facilities;
        DROP POLICY IF EXISTS facilities_delete_admin ON facilities;
        
        -- Recreate with is_admin check
        CREATE POLICY "Anyone can view facilities"
        ON facilities FOR SELECT
        USING (true);
        
        CREATE POLICY "Admins can insert facilities"
        ON facilities FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND is_admin = true
            )
        );
        
        CREATE POLICY "Admins can update facilities"
        ON facilities FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND is_admin = true
            )
        );
        
        CREATE POLICY "Admins can delete facilities"
        ON facilities FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND is_admin = true
            )
        );
    END IF;
END $$;

-- Set your account as admin
UPDATE profiles 
SET is_admin = true, role = 'administrator'
WHERE email = 'jking4600@gmail.com';

-- Verify the fix
SELECT 
    'Enum values:' as check_type,
    string_agg(enumlabel::text, ', ' ORDER BY enumsortorder) as values
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype

UNION ALL

SELECT 
    'Your profile:' as check_type,
    email || ' - role: ' || role || ', is_admin: ' || is_admin::text as values
FROM profiles 
WHERE email = 'jking4600@gmail.com';


