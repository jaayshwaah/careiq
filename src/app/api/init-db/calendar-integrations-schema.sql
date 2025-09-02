-- Calendar integrations database schema for CareIQ

-- Table to store user's calendar integration settings
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple_caldav')),
    
    -- OAuth credentials (encrypted in production)
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    
    -- CalDAV specific settings
    caldav_url TEXT, -- For Apple Calendar and other CalDAV servers
    caldav_username TEXT,
    caldav_password TEXT, -- Should be encrypted
    
    -- Integration settings
    is_active BOOLEAN DEFAULT false,
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('real-time', 'hourly', 'daily', 'weekly')),
    
    -- Metadata
    display_name TEXT, -- User-friendly name for the integration
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'success', 'error')),
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, provider) -- One integration per provider per user
);

-- Table to store calendar types and their sync mappings
CREATE TABLE IF NOT EXISTS calendar_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Calendar type definition
    name TEXT NOT NULL, -- e.g., "Care Plan Calendar", "Daily Rounds Calendar"
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('care_plan', 'daily_rounds', 'appointments', 'compliance', 'training', 'meetings', 'custom')),
    color TEXT DEFAULT '#3B82F6', -- Hex color for calendar display
    
    -- Integration mappings - which external calendars to sync with
    google_calendar_id TEXT,
    outlook_calendar_id TEXT,
    apple_calendar_name TEXT,
    
    -- Sync settings
    sync_to_external BOOLEAN DEFAULT true,
    sync_from_external BOOLEAN DEFAULT false, -- Usually one-way from CareIQ to external
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced events table that can sync with external calendars
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_type_id UUID REFERENCES calendar_types(id) ON DELETE SET NULL,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT false,
    
    -- CareIQ specific categorization
    category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('care_plan', 'daily_rounds', 'appointment', 'compliance', 'training', 'meeting', 'custom')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    compliance_related BOOLEAN DEFAULT false,
    
    -- External calendar sync tracking
    google_event_id TEXT,
    outlook_event_id TEXT,
    apple_event_uid TEXT,
    
    -- Sync metadata
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict')),
    last_synced_at TIMESTAMPTZ,
    sync_error TEXT,
    
    -- Recurrence support
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- RFC 5545 RRULE format
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure end time is after start time
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Table to track sync operations
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    
    -- Sync details
    sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'scheduled', 'webhook')),
    sync_direction TEXT NOT NULL CHECK (sync_direction IN ('push', 'pull', 'bidirectional')),
    
    -- Results
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'success', 'partial_success', 'error')),
    events_processed INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_deleted INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    
    -- Performance metrics
    execution_time_ms INTEGER,
    error_message TEXT,
    
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Table to handle sync conflicts
CREATE TABLE IF NOT EXISTS calendar_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('time_overlap', 'data_mismatch', 'external_change', 'permission_error')),
    local_data JSONB, -- CareIQ event data
    external_data JSONB, -- External calendar event data
    
    -- Resolution
    resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved_local', 'resolved_external', 'resolved_manual', 'ignored')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_active ON calendar_integrations(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_calendar_types_user_category ON calendar_types(user_id, category);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_status ON calendar_events(sync_status) WHERE sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_user_date ON calendar_sync_logs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_conflicts_pending ON calendar_sync_conflicts(user_id) WHERE resolution_status = 'pending';

-- Row Level Security (RLS) policies
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_integrations
CREATE POLICY "Users can view their own calendar integrations" ON calendar_integrations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own calendar integrations" ON calendar_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar integrations" ON calendar_integrations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar integrations" ON calendar_integrations
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for calendar_types
CREATE POLICY "Users can view their own calendar types" ON calendar_types
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own calendar types" ON calendar_types
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar types" ON calendar_types
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar types" ON calendar_types
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for calendar_events
CREATE POLICY "Users can view their own calendar events" ON calendar_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own calendar events" ON calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar events" ON calendar_events
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar events" ON calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for calendar_sync_logs
CREATE POLICY "Users can view their own sync logs" ON calendar_sync_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert sync logs" ON calendar_sync_logs
    FOR INSERT WITH CHECK (true); -- Service role can insert

-- RLS policies for calendar_sync_conflicts
CREATE POLICY "Users can view their own sync conflicts" ON calendar_sync_conflicts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own sync conflicts" ON calendar_sync_conflicts
    FOR UPDATE USING (auth.uid() = user_id);

-- Migrate existing compliance_events to new calendar_events table
INSERT INTO calendar_events (
    user_id,
    title,
    start_time,
    category,
    description,
    compliance_related,
    created_at,
    updated_at
)
SELECT 
    user_id,
    title,
    date::timestamptz,
    COALESCE(category, 'compliance'),
    notes,
    true, -- All existing events are compliance-related
    created_at,
    updated_at
FROM compliance_events
ON CONFLICT DO NOTHING;

-- Create default calendar types for each user
INSERT INTO calendar_types (user_id, name, description, category, color)
SELECT DISTINCT 
    user_id,
    'Care Plan Calendar' as name,
    'Care plan events and milestones' as description,
    'care_plan' as category,
    '#10B981' as color -- Green
FROM calendar_events
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_types ct 
    WHERE ct.user_id = calendar_events.user_id 
    AND ct.category = 'care_plan'
)
UNION ALL
SELECT DISTINCT 
    user_id,
    'Daily Rounds Calendar',
    'Daily round schedules and completion tracking',
    'daily_rounds',
    '#3B82F6' -- Blue
FROM calendar_events
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_types ct 
    WHERE ct.user_id = calendar_events.user_id 
    AND ct.category = 'daily_rounds'
)
UNION ALL
SELECT DISTINCT 
    user_id,
    'Compliance Calendar',
    'Regulatory compliance deadlines and surveys',
    'compliance',
    '#EF4444' -- Red
FROM calendar_events
WHERE NOT EXISTS (
    SELECT 1 FROM calendar_types ct 
    WHERE ct.user_id = calendar_events.user_id 
    AND ct.category = 'compliance'
);

-- Functions for calendar integration
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at timestamps
CREATE TRIGGER update_calendar_integrations_updated_at 
    BEFORE UPDATE ON calendar_integrations 
    FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER update_calendar_types_updated_at 
    BEFORE UPDATE ON calendar_types 
    FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();