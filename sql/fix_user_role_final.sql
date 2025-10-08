-- Final safe fix for user_role enum
-- Works around policy dependencies by using a different approach

-- Step 1: Just add 'administrator' to the existing enum if possible
DO $$ 
BEGIN
    -- Try to add the value (works if enum exists and doesn't have the value)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'administrator'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'administrator';
        RAISE NOTICE 'Added administrator to user_role enum';
    ELSE
        RAISE NOTICE 'administrator already exists in enum';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Enum doesn't exist, create it
        CREATE TYPE user_role AS ENUM ('staff', 'admin', 'administrator', 'super_admin');
        RAISE NOTICE 'Created user_role enum';
END $$;

-- Step 2: Ensure is_admin column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Step 3: Set your account as admin
UPDATE profiles 
SET is_admin = true
WHERE email = 'jking4600@gmail.com';

-- Step 4: Set role to administrator (separate to avoid type issues)
UPDATE profiles 
SET role = 'administrator'::user_role
WHERE email = 'jking4600@gmail.com';

-- Step 5: Update any existing 'admin' roles to 'administrator' if needed
-- (Only if you want consistency)
-- UPDATE profiles SET role = 'administrator' WHERE role = 'admin';

-- Verify
SELECT 
    email,
    role,
    is_admin,
    created_at
FROM profiles 
WHERE email = 'jking4600@gmail.com'
LIMIT 1;

