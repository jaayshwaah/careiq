-- Final fix for profiles table RLS infinite recursion
-- This completely removes all problematic policies and creates simple, safe ones

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (including any that may cause recursion)
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN 
    -- Get all policies for the profiles table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Step 3: Drop any problematic functions that might cause recursion
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS is_admin_user(uuid);
DROP FUNCTION IF EXISTS check_user_access(uuid);
DROP FUNCTION IF EXISTS admin_list_users();
DROP FUNCTION IF EXISTS admin_create_profile(uuid, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text, text, boolean);
DROP FUNCTION IF EXISTS update_user_permissions(uuid, text, boolean);

-- Step 4: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, non-recursive policies
-- Allow users to read their own profile (no function calls, direct comparison only)
CREATE POLICY "users_read_own_profile" ON profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Allow users to update their own profile (no function calls)
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "users_insert_own_profile" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Step 6: Create a safe admin access policy using service role bypass
-- Service role clients automatically bypass RLS, so no policy needed for admin operations

-- Step 7: Create safe utility functions that don't trigger RLS
CREATE OR REPLACE FUNCTION public.safe_create_profile(
    target_user_id UUID,
    user_email TEXT,
    user_full_name TEXT DEFAULT NULL,
    user_role TEXT DEFAULT 'DON_Unit_Manager',
    user_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- This function runs with SECURITY DEFINER, bypassing RLS
    INSERT INTO profiles (
        user_id,
        email,
        full_name,
        role,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        target_user_id,
        user_email,
        COALESCE(user_full_name, split_part(user_email, '@', 1)),
        user_role,
        user_is_admin,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = EXCLUDED.role,
        is_admin = EXCLUDED.is_admin,
        updated_at = NOW()
    RETURNING user_id INTO profile_id;
    
    RETURN profile_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION safe_create_profile TO authenticated;
GRANT EXECUTE ON FUNCTION safe_create_profile TO service_role;

-- Step 8: Create trigger for new user registration (safe, no RLS dependency)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only create profile if it doesn't exist
    INSERT INTO profiles (user_id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Step 9: Drop existing function first, then create admin list function that uses service role context
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    facility_name TEXT,
    facility_state TEXT,
    facility_id TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function runs with elevated privileges, bypassing RLS
    RETURN QUERY
    SELECT 
        p.user_id,
        p.email,
        p.full_name,
        p.role,
        p.facility_name,
        p.facility_state,
        p.facility_id,
        p.is_admin,
        p.created_at,
        p.updated_at,
        p.approved_at
    FROM profiles p
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users TO service_role;

-- Step 10: Verify the setup
SELECT 'RLS Setup Complete' as status;
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'profiles';

-- Add helpful comments
COMMENT ON TABLE profiles IS 'User profiles with safe RLS policies - no recursion risk';
COMMENT ON FUNCTION safe_create_profile IS 'Safe profile creation that bypasses RLS using SECURITY DEFINER';
COMMENT ON FUNCTION admin_list_users IS 'Admin function to list all users, bypasses RLS safely';