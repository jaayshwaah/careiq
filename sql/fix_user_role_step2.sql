-- Step 2: Set your account as admin
-- Run this AFTER running step 1

-- Ensure is_admin column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set your account as admin
UPDATE profiles 
SET is_admin = true
WHERE email = 'jking4600@gmail.com';

-- Set role to administrator (now that the enum value is committed)
UPDATE profiles 
SET role = 'administrator'
WHERE email = 'jking4600@gmail.com';

-- Verify everything worked
SELECT 
    email,
    role,
    is_admin,
    created_at
FROM profiles 
WHERE email = 'jking4600@gmail.com'
LIMIT 1;


