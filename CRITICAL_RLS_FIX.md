# CRITICAL: RLS Infinite Recursion Fix

## The Problem
The "infinite recursion detected in policy for relation 'profiles'" error occurs when RLS policies reference functions or other tables that create circular dependencies.

## The Solution
**Run this SQL script in your Supabase database to fix the issue permanently:**

```sql
-- STEP 1: Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies that might cause recursion
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN 
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- STEP 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create simple, safe policies (NO function calls, NO recursion)
CREATE POLICY "simple_select" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "simple_insert" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simple_update" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);
```

## Why This Works
1. **No function calls** in policies = no recursion risk
2. **Service role automatically bypasses RLS** = admin operations work seamlessly
3. **Simple auth.uid() comparisons** = fast and safe

## Verification
After running the script:
1. Check policies: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`
2. Test user operations (should work)
3. Test admin operations (should work via service role)

## Key Points
- Service role clients (used in admin APIs) automatically bypass ALL RLS policies
- Regular user tokens respect the simple policies above
- No custom functions needed = no recursion possible

This fix is **permanent** and **safe**.