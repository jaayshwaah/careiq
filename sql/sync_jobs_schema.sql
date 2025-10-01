-- Sync Jobs Schema for Real-time Data Synchronization
-- This table tracks all synchronization jobs across different integration types

CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('census', 'staffing', 'quality', 'supply', 'calendar', 'ehr', 'supplier')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Progress tracking
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step TEXT,
    total_steps INTEGER,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Data and results
    input_data JSONB,
    result_data JSONB,
    metadata JSONB DEFAULT '{}',
    
    -- User tracking
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_timing CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (completed_at IS NULL OR completed_at >= COALESCE(started_at, created_at))
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_facility_id ON sync_jobs(facility_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type ON sync_jobs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_priority ON sync_jobs(priority, created_at);

-- RLS Policies
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for users to see jobs for their facility
CREATE POLICY "Users can view sync jobs for their facility" ON sync_jobs
    FOR SELECT USING (
        facility_id::uuid IN (
            SELECT facility_id FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for users to create sync jobs for their facility
CREATE POLICY "Users can create sync jobs for their facility" ON sync_jobs
    FOR INSERT WITH CHECK (
        facility_id::uuid IN (
            SELECT facility_id FROM profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for users to update sync jobs they created
CREATE POLICY "Users can update sync jobs they created" ON sync_jobs
    FOR UPDATE USING (
        created_by = auth.uid() OR
        facility_id::uuid IN (
            SELECT facility_id FROM profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR role::text ILIKE '%manager%')
        )
    );

-- Function to clean up old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_sync_jobs()
RETURNS void AS $$
BEGIN
    -- Delete completed jobs older than 30 days
    DELETE FROM sync_jobs 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '30 days';
    
    -- Delete failed jobs older than 7 days
    DELETE FROM sync_jobs 
    WHERE status = 'failed' 
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get sync job statistics
CREATE OR REPLACE FUNCTION get_sync_job_stats(facility_id_param TEXT)
RETURNS TABLE (
    total_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    running_jobs BIGINT,
    avg_duration_seconds NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as success_rate
    FROM sync_jobs
    WHERE sync_jobs.facility_id = facility_id_param
    AND sync_jobs.created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO sync_jobs (facility_id, sync_type, status, priority, progress, created_by) VALUES
('facility-1', 'census', 'completed', 'high', 100, (SELECT id FROM auth.users LIMIT 1)),
('facility-1', 'staffing', 'running', 'medium', 45, (SELECT id FROM auth.users LIMIT 1)),
('facility-1', 'quality', 'pending', 'low', 0, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;
