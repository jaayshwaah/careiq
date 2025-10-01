-- Fix RLS Policy Conflicts
-- This script safely handles existing policies by dropping and recreating them

-- Function to safely create policies
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

-- Fix CMS Regulations Policies
SELECT create_policy_safely('cms_regulations', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('cms_regulations', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('cms_regulations', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Fix Compliance Updates Policies
SELECT create_policy_safely('compliance_updates', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_updates', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_updates', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Fix Compliance Resources Policies
SELECT create_policy_safely('compliance_resources', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_resources', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_resources', 'Enable update for resource owners', 
    'FOR UPDATE', 'USING (auth.uid() = created_by)');

-- Fix Document Analyses Policies
SELECT create_policy_safely('document_analyses', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('document_analyses', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('document_analyses', 'Enable update for document owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Survey Predictions Policies
SELECT create_policy_safely('survey_predictions', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('survey_predictions', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('survey_predictions', 'Enable update for prediction owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Compliance Monitoring Policies
SELECT create_policy_safely('compliance_monitoring', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_monitoring', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('compliance_monitoring', 'Enable update for monitoring owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Integration Sync Logs Policies
SELECT create_policy_safely('integration_sync_logs', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('integration_sync_logs', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');

-- Fix Residents Policies
SELECT create_policy_safely('residents', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('residents', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('residents', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Fix Medications Policies
SELECT create_policy_safely('medications', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('medications', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('medications', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Fix Staff Shifts Policies
SELECT create_policy_safely('staff_shifts', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('staff_shifts', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('staff_shifts', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Fix Quality Indicators Policies
SELECT create_policy_safely('quality_indicators', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('quality_indicators', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('quality_indicators', 'Enable update for authenticated users', 
    'FOR UPDATE', 'USING (auth.role() = ''authenticated'')');

-- Fix Teams Policies
SELECT create_policy_safely('teams', 'Enable read access for team members', 
    'FOR SELECT', 'USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.status = ''active''))');
SELECT create_policy_safely('teams', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('teams', 'Enable update for team leaders', 
    'FOR UPDATE', 'USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role IN (''leader'', ''admin'') AND team_members.status = ''active''))');

-- Fix Team Members Policies
SELECT create_policy_safely('team_members', 'Enable read access for team members', 
    'FOR SELECT', 'USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.status = ''active''))');
SELECT create_policy_safely('team_members', 'Enable insert for team leaders', 
    'FOR INSERT', 'WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_members.team_id AND team_members.user_id = auth.uid() AND team_members.role IN (''leader'', ''admin'') AND team_members.status = ''active''))');
SELECT create_policy_safely('team_members', 'Enable update for team leaders', 
    'FOR UPDATE', 'USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_members.team_id AND team_members.user_id = auth.uid() AND team_members.role IN (''leader'', ''admin'') AND team_members.status = ''active''))');

-- Fix Team Activities Policies
SELECT create_policy_safely('team_activities', 'Enable read access for team members', 
    'FOR SELECT', 'USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_activities.team_id AND team_members.user_id = auth.uid() AND team_members.status = ''active''))');
SELECT create_policy_safely('team_activities', 'Enable insert for team members', 
    'FOR INSERT', 'WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = team_activities.team_id AND team_members.user_id = auth.uid() AND team_members.status = ''active''))');

-- Fix Quality Assessments Policies
SELECT create_policy_safely('quality_assessments', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('quality_assessments', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('quality_assessments', 'Enable update for assessment owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Performance Optimizations Policies
SELECT create_policy_safely('performance_optimizations', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('performance_optimizations', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('performance_optimizations', 'Enable update for optimization owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Analytics Cache Policies
SELECT create_policy_safely('analytics_cache', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('analytics_cache', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('analytics_cache', 'Enable update for cache owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id OR user_id IS NULL)');

-- Fix Collaboration Comments Policies
SELECT create_policy_safely('collaboration_comments', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('collaboration_comments', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('collaboration_comments', 'Enable update for comment owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Real-time Notifications Policies
SELECT create_policy_safely('real_time_notifications', 'Enable read access for notification owners', 
    'FOR SELECT', 'USING (auth.uid() = user_id)');
SELECT create_policy_safely('real_time_notifications', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('real_time_notifications', 'Enable update for notification owners', 
    'FOR UPDATE', 'USING (auth.uid() = user_id)');

-- Fix Advanced Report Templates Policies
SELECT create_policy_safely('advanced_report_templates', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'' AND (is_public = true OR created_by = auth.uid()))');
SELECT create_policy_safely('advanced_report_templates', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('advanced_report_templates', 'Enable update for template owners', 
    'FOR UPDATE', 'USING (auth.uid() = created_by)');

-- Fix Performance Metrics Policies
SELECT create_policy_safely('performance_metrics', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'')');
SELECT create_policy_safely('performance_metrics', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');

-- Fix Workflow Templates Policies
SELECT create_policy_safely('workflow_templates', 'Enable read access for authenticated users', 
    'FOR SELECT', 'USING (auth.role() = ''authenticated'' AND (is_public = true OR created_by = auth.uid()))');
SELECT create_policy_safely('workflow_templates', 'Enable insert for authenticated users', 
    'FOR INSERT', 'WITH CHECK (auth.role() = ''authenticated'')');
SELECT create_policy_safely('workflow_templates', 'Enable update for template owners', 
    'FOR UPDATE', 'USING (auth.uid() = created_by)');

-- Clean up the helper function
DROP FUNCTION IF EXISTS create_policy_safely(text, text, text, text);
