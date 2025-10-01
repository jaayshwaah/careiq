-- Phase 3: Advanced Features Database Schema
-- Analytics, Compliance, Collaboration, and Performance Optimization

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    facility_id TEXT NOT NULL,
    team_type TEXT NOT NULL CHECK (team_type IN ('department', 'project', 'committee', 'shift')),
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'admin', 'member', 'observer')),
    permissions TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- Team Activities Table
CREATE TABLE IF NOT EXISTS team_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('task_created', 'task_completed', 'member_added', 'member_removed', 'role_changed', 'comment_added')),
    activity_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quality Assessments Table
CREATE TABLE IF NOT EXISTS quality_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monitoring_type TEXT NOT NULL CHECK (monitoring_type IN ('comprehensive', 'focused', 'real_time')),
    focus_areas TEXT[] DEFAULT '{}',
    alert_thresholds JSONB DEFAULT '{}',
    assessment_result JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Optimizations Table
CREATE TABLE IF NOT EXISTS performance_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    optimization_type TEXT NOT NULL CHECK (optimization_type IN ('database', 'cache', 'queries', 'indexes', 'comprehensive')),
    target_areas TEXT[] DEFAULT '{}',
    performance_thresholds JSONB DEFAULT '{}',
    optimization_result JSONB NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Advanced Analytics Cache Table
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    cache_data JSONB NOT NULL,
    cache_type TEXT NOT NULL CHECK (cache_type IN ('dashboard', 'report', 'kpi', 'trend')),
    facility_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Collaboration Comments Table
CREATE TABLE IF NOT EXISTS collaboration_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'team', 'project', 'document')),
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'suggestion', 'question', 'answer')),
    parent_comment_id UUID REFERENCES collaboration_comments(id) ON DELETE CASCADE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Real-time Notifications Table
CREATE TABLE IF NOT EXISTS real_time_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('alert', 'reminder', 'update', 'assignment', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Advanced Reporting Templates Table
CREATE TABLE IF NOT EXISTS advanced_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('compliance', 'quality', 'financial', 'operational', 'custom')),
    report_type TEXT NOT NULL CHECK (report_type IN ('dashboard', 'summary', 'detailed', 'comparative', 'trend')),
    template_config JSONB NOT NULL,
    data_sources TEXT[] DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    visualizations JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit TEXT,
    metric_category TEXT NOT NULL CHECK (metric_category IN ('database', 'api', 'cache', 'query', 'system')),
    facility_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- Workflow Templates Table
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('admission', 'discharge', 'compliance', 'quality', 'maintenance', 'custom')),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'condition')),
    trigger_config JSONB DEFAULT '{}',
    workflow_steps JSONB NOT NULL DEFAULT '[]',
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Teams Policies
CREATE POLICY "Enable read access for team members" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = teams.id 
            AND team_members.user_id = auth.uid() 
            AND team_members.status = 'active'
        )
    );
CREATE POLICY "Enable insert for authenticated users" ON teams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for team leaders" ON teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = teams.id 
            AND team_members.user_id = auth.uid() 
            AND team_members.role IN ('leader', 'admin')
            AND team_members.status = 'active'
        )
    );

-- Team Members Policies
CREATE POLICY "Enable read access for team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm 
            WHERE tm.team_id = team_members.team_id 
            AND tm.user_id = auth.uid() 
            AND tm.status = 'active'
        )
    );
CREATE POLICY "Enable insert for team leaders" ON team_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = team_members.team_id 
            AND team_members.user_id = auth.uid() 
            AND team_members.role IN ('leader', 'admin')
            AND team_members.status = 'active'
        )
    );
CREATE POLICY "Enable update for team leaders" ON team_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = team_members.team_id 
            AND team_members.user_id = auth.uid() 
            AND team_members.role IN ('leader', 'admin')
            AND team_members.status = 'active'
        )
    );

-- Team Activities Policies
CREATE POLICY "Enable read access for team members" ON team_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = team_activities.team_id 
            AND team_members.user_id = auth.uid() 
            AND team_members.status = 'active'
        )
    );
CREATE POLICY "Enable insert for team members" ON team_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = team_activities.team_id 
            AND team_members.user_id = auth.uid() 
            AND team_members.status = 'active'
        )
    );

-- Quality Assessments Policies
CREATE POLICY "Enable read access for authenticated users" ON quality_assessments
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON quality_assessments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for assessment owners" ON quality_assessments
    FOR UPDATE USING (auth.uid() = user_id);

-- Performance Optimizations Policies
CREATE POLICY "Enable read access for authenticated users" ON performance_optimizations
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON performance_optimizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for optimization owners" ON performance_optimizations
    FOR UPDATE USING (auth.uid() = user_id);

-- Analytics Cache Policies
CREATE POLICY "Enable read access for authenticated users" ON analytics_cache
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON analytics_cache
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for cache owners" ON analytics_cache
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Collaboration Comments Policies
CREATE POLICY "Enable read access for authenticated users" ON collaboration_comments
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON collaboration_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for comment owners" ON collaboration_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Real-time Notifications Policies
CREATE POLICY "Enable read access for notification owners" ON real_time_notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON real_time_notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for notification owners" ON real_time_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Advanced Report Templates Policies
CREATE POLICY "Enable read access for authenticated users" ON advanced_report_templates
    FOR SELECT USING (auth.role() = 'authenticated' AND (is_public = true OR created_by = auth.uid()));
CREATE POLICY "Enable insert for authenticated users" ON advanced_report_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for template owners" ON advanced_report_templates
    FOR UPDATE USING (auth.uid() = created_by);

-- Performance Metrics Policies
CREATE POLICY "Enable read access for authenticated users" ON performance_metrics
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON performance_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Workflow Templates Policies
CREATE POLICY "Enable read access for authenticated users" ON workflow_templates
    FOR SELECT USING (auth.role() = 'authenticated' AND (is_public = true OR created_by = auth.uid()));
CREATE POLICY "Enable insert for authenticated users" ON workflow_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for template owners" ON workflow_templates
    FOR UPDATE USING (auth.uid() = created_by);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_teams_facility_id ON teams(facility_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_type ON teams(team_type);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

CREATE INDEX IF NOT EXISTS idx_team_activities_team_id ON team_activities(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_user_id ON team_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_type ON team_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_team_activities_created_at ON team_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_quality_assessments_facility_id ON quality_assessments(facility_id);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_user_id ON quality_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_type ON quality_assessments(monitoring_type);
CREATE INDEX IF NOT EXISTS idx_quality_assessments_generated_at ON quality_assessments(generated_at);

CREATE INDEX IF NOT EXISTS idx_performance_optimizations_user_id ON performance_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_optimizations_type ON performance_optimizations(optimization_type);
CREATE INDEX IF NOT EXISTS idx_performance_optimizations_executed_at ON performance_optimizations(executed_at);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_type ON analytics_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_facility_id ON analytics_cache(facility_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_collaboration_comments_entity ON collaboration_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_user_id ON collaboration_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_parent ON collaboration_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_created_at ON collaboration_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON real_time_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON real_time_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON real_time_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON real_time_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON real_time_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_report_templates_category ON advanced_report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON advanced_report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_public ON advanced_report_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON advanced_report_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_category ON performance_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_facility_id ON performance_metrics(facility_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_trigger_type ON workflow_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active);

-- Sample Data for Testing
INSERT INTO teams (name, description, facility_id, team_type, permissions, created_by) 
SELECT 
    'Nursing Team Alpha',
    'Primary nursing team for Unit A',
    'facility-001',
    'department',
    ARRAY['manage_tasks', 'view_reports', 'collaborate'],
    (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Nursing Team Alpha');

INSERT INTO teams (name, description, facility_id, team_type, permissions, created_by) 
SELECT 
    'Quality Improvement Committee',
    'Cross-functional team for quality initiatives',
    'facility-001',
    'committee',
    ARRAY['manage_quality', 'view_analytics', 'create_reports'],
    (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Quality Improvement Committee');

INSERT INTO workflow_templates (name, description, category, trigger_type, trigger_config, workflow_steps, is_public, created_by)
SELECT 
    'New Admission Workflow',
    'Automated workflow for new resident admissions',
    'admission',
    'event',
    '{"event_type": "new_admission", "facility_id": "facility-001"}',
    '[
        {"step": 1, "type": "create_task", "title": "Complete Admission Assessment", "assigned_to": "nursing", "priority": "high"},
        {"step": 2, "type": "create_task", "title": "Set Up Care Plan", "assigned_to": "care_coordinator", "priority": "high"},
        {"step": 3, "type": "create_task", "title": "Medication Review", "assigned_to": "pharmacy", "priority": "medium"},
        {"step": 4, "type": "send_notification", "message": "New admission completed", "recipients": ["family", "physician"]}
    ]',
    true,
    (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM workflow_templates WHERE name = 'New Admission Workflow');
