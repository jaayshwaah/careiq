-- Step 1: Add 'administrator' to user_role enum
-- Run this first, THEN run step 2

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

-- Verify the enum now has 'administrator'
SELECT enumlabel as available_roles 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;


