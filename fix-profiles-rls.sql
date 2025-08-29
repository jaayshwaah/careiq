-- Fix profiles table RLS infinite recursion
-- This script temporarily disables RLS and creates a simpler, non-recursive policy

-- First, let's see what policies exist
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Allow users to read their own profile
CREATE POLICY "simple_profile_select" ON profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Allow users to insert their own profile (one-time)
CREATE POLICY "simple_profile_insert" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "simple_profile_update" ON profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS (for bootstrap and admin operations)
-- This is handled by using the service role client which bypasses RLS automatically

-- Create a function to safely create profiles (without RLS conflicts)
CREATE OR REPLACE FUNCTION create_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'user',
    p_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result profiles;
BEGIN
    -- Insert or update the profile
    INSERT INTO profiles (
        user_id,
        email,
        full_name,
        role,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        COALESCE(p_full_name, split_part(p_email, '@', 1)),
        p_role,
        p_is_admin,
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
    RETURNING * INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;

-- Create a trigger to automatically create profiles for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Create trigger on auth.users (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'User profiles with simple RLS policies to prevent infinite recursion';
COMMENT ON FUNCTION create_user_profile IS 'Safely creates or updates user profiles bypassing RLS issues';
COMMENT ON FUNCTION handle_new_user IS 'Automatically creates profile when new user signs up';