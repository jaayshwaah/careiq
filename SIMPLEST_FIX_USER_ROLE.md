# Simplest Fix: User Role Error

## The Problem
Your database has policies that reference the `role` column, preventing type changes.

## Easiest Solution: Just Use is_admin

Instead of fighting with the enum, just rely on the `is_admin` boolean column:

### Step 1: Set yourself as admin
```sql
-- Run this in Supabase SQL Editor
UPDATE profiles 
SET is_admin = true 
WHERE email = 'jking4600@gmail.com';
```

### Step 2: Update any role-based checks to use is_admin
```sql
-- If you have policies checking role, update them to check is_admin instead
-- For example, change:
-- WHERE role = 'administrator'
-- To:
-- WHERE is_admin = true
```

That's it! Your code already uses `is_admin` as the primary check.

---

## Complete Fix (If you need the enum fixed)

If you really need "administrator" in the enum, run this safe script:

```bash
cat sql/fix_user_role_safe.sql | pbcopy
```

Then paste and run in Supabase SQL Editor.

**What it does:**
1. Drops all policies that reference the role column
2. Converts role to text temporarily
3. Fixes the enum
4. Converts back to enum
5. Recreates all policies using `is_admin` instead of role
6. Sets your account as admin

---

## Alternative: Keep role as text

If you want maximum flexibility:

```sql
-- 1. Drop policies that reference role
DROP POLICY IF EXISTS facilities_insert_admin ON facilities;
-- (repeat for other policies)

-- 2. Convert role to text permanently
ALTER TABLE profiles ALTER COLUMN role TYPE text;

-- 3. Recreate policies using is_admin
CREATE POLICY "Admins can manage facilities"
ON facilities FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);
```

---

## Recommended: Quick Win

Just do this:

```sql
-- Set yourself as admin
UPDATE profiles SET is_admin = true WHERE email = 'jking4600@gmail.com';

-- All your code checks is_admin anyway!
```

Then in your policies, use `is_admin` instead of checking role strings. It's cleaner and more reliable.


