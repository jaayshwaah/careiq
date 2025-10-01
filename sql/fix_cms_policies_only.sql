-- Fix CMS Regulations Policy Conflicts Only
-- This script only fixes the specific CMS regulations policy conflict

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cms_regulations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON cms_regulations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON cms_regulations;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON cms_regulations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON cms_regulations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON cms_regulations
    FOR UPDATE USING (auth.role() = 'authenticated');
