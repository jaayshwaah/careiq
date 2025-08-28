-- Complementary functions for your admin user management

-- Function to quickly create CareIQ staff accounts
CREATE OR REPLACE FUNCTION create_careiq_staff(
    staff_email TEXT,
    staff_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Validate email domain
    IF NOT staff_email LIKE '%@careiq.com' THEN
        RAISE EXCEPTION 'CareIQ staff must have @careiq.com email address';
    END IF;
    
    -- Create auth user (you'll need to do this via Supabase Dashboard or API)
    -- This is a placeholder - actual user creation happens in Supabase Auth
    
    -- For now, assume user_id is provided or generated
    new_user_id := gen_random_uuid();
    
    -- Create profile with CareIQ staff permissions
    PERFORM admin_create_profile(
        new_user_id,
        'CareIQ Staff',
        'CAREIQ-HQ',
        'CareIQ Headquarters',
        'CA',
        staff_name,
        staff_email
    );
    
    RETURN new_user_id;
END;
$$;

-- Function to list all admin users for management
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    facility_name TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR role = 'Administrator' OR role = 'CareIQ Staff')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id,
        p.email,
        p.full_name,
        p.role,
        p.facility_name,
        p.is_admin,
        p.created_at,
        au.last_sign_in_at
    FROM profiles p
    LEFT JOIN auth.users au ON p.user_id = au.id
    WHERE p.role IN ('Administrator', 'CareIQ Staff') 
       OR p.is_admin = true
    ORDER BY p.created_at DESC;
END;
$$;

-- Function to update user permissions
CREATE OR REPLACE FUNCTION update_user_permissions(
    target_user_id UUID,
    new_role TEXT,
    set_admin BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR role = 'CareIQ Staff')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- Update profile
    UPDATE profiles 
    SET 
        role = COALESCE(new_role, role),
        is_admin = COALESCE(set_admin, is_admin),
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RETURN FOUND;
END;
$$;

-- Example usage commands:
-- 
-- Create an administrator for a facility:
-- SELECT admin_create_profile(
--     'user-uuid-here'::UUID,
--     'Administrator',
--     'FAC-001',
--     'Sunshine Nursing Home',
--     'CA',
--     'Jane Smith',
--     'jane.smith@facility.com'
-- );
--
-- Create CareIQ staff:
-- SELECT create_careiq_staff('john.doe@careiq.com', 'John Doe');
--
-- List all admin users:
-- SELECT * FROM list_admin_users();
--
-- Update permissions:
-- SELECT update_user_permissions('user-uuid'::UUID, 'Administrator', true);