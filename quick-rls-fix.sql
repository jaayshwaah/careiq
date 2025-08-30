-- Quick fix for RLS infinite recursion on profiles table
-- Run this in your Supabase SQL editor

-- Step 1: Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies that might cause recursion
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
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "simple_profile_select" ON profiles;
DROP POLICY IF EXISTS "simple_profile_insert" ON profiles;
DROP POLICY IF EXISTS "simple_profile_update" ON profiles;

-- Step 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, safe policies with no function calls
CREATE POLICY "safe_select_own_profile" ON profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "safe_insert_own_profile" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "safe_update_own_profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 5: Verify the setup
SELECT 'RLS policies updated successfully' as status;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';

-- Note: Service role clients automatically bypass ALL RLS policies
-- so admin operations in your app will work regardless of these policies