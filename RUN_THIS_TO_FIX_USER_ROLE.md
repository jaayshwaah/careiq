# Fix User Role - Two Step Process

## Why Two Steps?

PostgreSQL requires enum values to be committed before they can be used. We need to:
1. Add "administrator" to the enum (Step 1)
2. Commit that transaction
3. Then use the new value (Step 2)

## Instructions

### Step 1: Add the enum value

Copy and run this in Supabase SQL Editor:

```bash
cat sql/fix_user_role_step1.sql | pbcopy
```

**Paste and run in Supabase → Execute**

You should see: "Added administrator to user_role enum"

---

### Step 2: Set your account as admin

After Step 1 completes, copy and run this:

```bash
cat sql/fix_user_role_step2.sql | pbcopy
```

**Paste and run in Supabase → Execute**

You should see your profile with:
- `role = 'administrator'`
- `is_admin = true`

---

## Quick Alternative

If you don't care about the role string, just do this:

```sql
-- Simple one-liner
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
UPDATE profiles SET is_admin = true WHERE email = 'jking4600@gmail.com';
```

Your code checks `is_admin` anyway, so this is all you really need!

---

## Verify

After running both steps, check:

```sql
SELECT email, role, is_admin 
FROM profiles 
WHERE email = 'jking4600@gmail.com';
```

Should show:
- email: `jking4600@gmail.com`
- role: `administrator`
- is_admin: `true`

✅ Done!


