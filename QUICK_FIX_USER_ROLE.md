# Quick Fix: User Role Enum Error

## Problem
`ERROR: 22P02: invalid input value for enum user_role: "administrator"`

This means your database has a `user_role` enum that doesn't include "administrator".

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- Quick fix: Add administrator to enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'administrator';
```

If that doesn't work (enum already has constraints), use this comprehensive fix:

```sql
-- Step 1: Convert role column to text temporarily
ALTER TABLE profiles ALTER COLUMN role TYPE text;

-- Step 2: Drop old enum
DROP TYPE IF EXISTS user_role CASCADE;

-- Step 3: Create new enum with all values
CREATE TYPE user_role AS ENUM (
    'staff',
    'nurse',
    'admin',
    'administrator',
    'manager',
    'director',
    'super_admin'
);

-- Step 4: Convert back to enum
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role 
USING role::user_role;

-- Verify
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;
```

## Alternative: Use Text Column Instead

If you prefer more flexibility, convert `role` to text:

```sql
-- Convert role to text (no enum restrictions)
ALTER TABLE profiles ALTER COLUMN role TYPE text;

-- Update is_admin logic to handle any role string
-- In your RLS policies, use:
-- WHERE is_admin = true OR role ILIKE '%admin%'
```

## Recommended Approach

**Option 1 (Best)**: Use `is_admin` boolean flag instead of relying on role string:

```sql
-- Add is_admin if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set your account as admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'jking4600@gmail.com';
```

Then in your code, check `userProfile.is_admin` instead of parsing role strings.

**Option 2**: Use text for role (more flexible):

```sql
ALTER TABLE profiles ALTER COLUMN role TYPE text;
```

## Current Workaround in Code

Your `AuthProvider.tsx` already has a fallback for your email:

```typescript
// Fallback for development
if (user.email === 'jking4600@gmail.com') {
  profile = {
    id: user.id,
    email: user.email,
    role: 'administrator',
    is_admin: true,
    // ...
  };
}
```

## Run the Fix

```bash
# Copy the fix SQL
cat sql/fix_user_role_enum.sql | pbcopy

# Then paste in Supabase SQL Editor and run
```

---

**Quick test after fix:**
```sql
-- Should show 'administrator' in the list
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype;
```


