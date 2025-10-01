-- Fix RLS Policy Conflicts for Existing Tables Only
-- This script only handles tables that currently exist in the database

-- Function to safely create policies for existing tables only
CREATE OR REPLACE FUNCTION create_policy_safely(
    target_table text,
    policy_name text,
    policy_type text,
    policy_definition text
) RETURNS void AS $$
BEGIN
    -- Check if table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = target_table AND table_schema = 'public') THEN
        -- Drop existing policy if it exists
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, target_table);
        
        -- Create new policy
        EXECUTE format('CREATE POLICY %I ON %I %s %s', 
            policy_name, target_table, policy_type, policy_definition);
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping policy creation', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix policies for tables that should exist
-- CMS Regulations (if exists)
SELECT create_policy_safely('cms_regulations', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('cms_regulations', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('cms_regulations', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Compliance Updates (if exists)
SELECT create_policy_safely('compliance_updates', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_updates', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_updates', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Compliance Resources (if exists)
SELECT create_policy_safely('compliance_resources', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_resources', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_resources', 'Enable update for resource owners', 
    'FOR UPDATE', 'USING (auth.uid() = created_by)');

-- Document Analyses (if exists)
SELECT create_policy_safely('document_analyses', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('document_analyses', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('document_analyses', 'Enable update for document owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Survey Predictions (if exists)
SELECT create_policy_safely('survey_predictions', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('survey_predictions', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('survey_predictions', 'Enable update for prediction owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Compliance Monitoring (if exists)
SELECT create_policy_safely('compliance_monitoring', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_monitoring', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_monitoring', 'Enable update for monitoring owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Integration Sync Logs (if exists)
SELECT create_policy_safely('integration_sync_logs', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('integration_sync_logs', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');

-- Residents (if exists)
SELECT create_policy_safely('residents', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('residents', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('residents', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Medications (if exists)
SELECT create_policy_safely('medications', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('medications', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('medications', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Staff Shifts (if exists)
SELECT create_policy_safely('staff_shifts', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('staff_shifts', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('staff_shifts', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Quality Indicators (if exists)
SELECT create_policy_safely('quality_indicators', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('quality_indicators', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('quality_indicators', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Clean up the helper function
DROP FUNCTION IF EXISTS create_policy_safely(text, text, text, text);
