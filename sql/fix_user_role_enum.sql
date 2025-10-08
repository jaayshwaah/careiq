-- Fix user_role enum to include administrator
-- This script safely updates the enum type

-- Option 1: If the user_role enum exists, add 'administrator' if missing
DO $$ 
BEGIN
    -- Check if the enum type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Add 'administrator' to the enum if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'user_role'::regtype 
            AND enumlabel = 'administrator'
        ) THEN
            ALTER TYPE user_role ADD VALUE 'administrator';
        END IF;
    ELSE
        -- Create the enum type if it doesn't exist
        CREATE TYPE user_role AS ENUM ('staff', 'administrator', 'super_admin');
    END IF;
END $$;

-- Option 2: If you want to completely recreate the enum with all needed values
-- (Use this if Option 1 doesn't work due to existing data)

-- First, let's check what values we need
-- Common roles: staff, nurse, admin, administrator, super_admin, manager, director

-- If profiles table exists and has a role column, we need to handle it carefully
DO $$ 
BEGIN
    -- Check if profiles table has role column as enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role'
        AND udt_name = 'user_role'
    ) THEN
        -- Change to text temporarily
        ALTER TABLE profiles ALTER COLUMN role TYPE text;
        
        -- Drop the old enum
        DROP TYPE IF EXISTS user_role CASCADE;
        
        -- Recreate with all values
        CREATE TYPE user_role AS ENUM (
            'staff',
            'nurse', 
            'admin',
            'administrator',
            'manager',
            'director',
            'super_admin'
        );
        
        -- Change back to enum
        ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
    END IF;
END $$;

-- Verify the fix
SELECT enumlabel as role_values 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;


