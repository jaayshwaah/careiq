-- Security Audits Schema for Enterprise Security Features
-- This table tracks security audits, vulnerabilities, and compliance issues

CREATE TABLE IF NOT EXISTS security_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('authentication', 'authorization', 'data_access', 'api_security', 'infrastructure', 'compliance')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
    
    -- Categorization
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Assignment and tracking
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    -- Additional data
    evidence JSONB DEFAULT '{}',
    remediation_notes TEXT,
    compliance_standard TEXT, -- e.g., 'HIPAA', 'SOC2', 'ISO27001'
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- External references
    external_id TEXT, -- Reference to external security tool
    cve_id TEXT, -- Common Vulnerabilities and Exposures ID
    owasp_category TEXT -- OWASP Top 10 category
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audits_type ON security_audits(type);
CREATE INDEX IF NOT EXISTS idx_security_audits_severity ON security_audits(severity);
CREATE INDEX IF NOT EXISTS idx_security_audits_status ON security_audits(status);
CREATE INDEX IF NOT EXISTS idx_security_audits_created_at ON security_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audits_assigned_to ON security_audits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_security_audits_compliance ON security_audits(compliance_standard);

-- RLS Policies
ALTER TABLE security_audits ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all audits
CREATE POLICY "Admins can view all security audits" ON security_audits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Policy for users to see audits assigned to them
CREATE POLICY "Users can view assigned security audits" ON security_audits
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid()
    );

-- Policy for admins to manage all audits
CREATE POLICY "Admins can manage all security audits" ON security_audits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Function to calculate security score
CREATE OR REPLACE FUNCTION calculate_security_score()
RETURNS NUMERIC AS $$
DECLARE
    total_audits INTEGER;
    resolved_audits INTEGER;
    critical_audits INTEGER;
    resolved_critical INTEGER;
    score NUMERIC;
BEGIN
    -- Get total audits
    SELECT COUNT(*) INTO total_audits FROM security_audits;
    
    -- Get resolved audits
    SELECT COUNT(*) INTO resolved_audits 
    FROM security_audits 
    WHERE status = 'resolved';
    
    -- Get critical audits
    SELECT COUNT(*) INTO critical_audits 
    FROM security_audits 
    WHERE severity = 'critical';
    
    -- Get resolved critical audits
    SELECT COUNT(*) INTO resolved_critical 
    FROM security_audits 
    WHERE severity = 'critical' AND status = 'resolved';
    
    -- Calculate score (0-100)
    IF total_audits = 0 THEN
        score := 100;
    ELSE
        -- Base score from resolved percentage
        score := (resolved_audits::NUMERIC / total_audits::NUMERIC) * 100;
        
        -- Penalty for unresolved critical issues
        IF critical_audits > 0 THEN
            score := score - ((critical_audits - resolved_critical)::NUMERIC / critical_audits::NUMERIC) * 30;
        END IF;
        
        -- Ensure score is between 0 and 100
        score := GREATEST(0, LEAST(100, score));
    END IF;
    
    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get security metrics
CREATE OR REPLACE FUNCTION get_security_metrics()
RETURNS TABLE (
    total_audits BIGINT,
    open_audits BIGINT,
    critical_audits BIGINT,
    resolved_this_month BIGINT,
    avg_resolution_days NUMERIC,
    security_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_audits,
        COUNT(*) FILTER (WHERE status = 'open') as open_audits,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_audits,
        COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= NOW() - INTERVAL '30 days') as resolved_this_month,
        AVG(EXTRACT(DAYS FROM (resolved_at - created_at))) as avg_resolution_days,
        calculate_security_score() as security_score
    FROM security_audits;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign audits based on type
CREATE OR REPLACE FUNCTION auto_assign_security_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign based on audit type
    IF NEW.type = 'authentication' OR NEW.type = 'authorization' THEN
        -- Assign to security admin (users with is_admin = true)
        SELECT user_id INTO NEW.assigned_to 
        FROM profiles 
        WHERE is_admin = true 
        ORDER BY created_at 
        LIMIT 1;
    ELSIF NEW.type = 'data_access' THEN
        -- Assign to admin or manager
        SELECT user_id INTO NEW.assigned_to 
        FROM profiles 
        WHERE is_admin = true OR role::text ILIKE '%manager%' OR role::text ILIKE '%director%'
        ORDER BY created_at 
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-assignment
CREATE TRIGGER auto_assign_security_audit_trigger
    BEFORE INSERT ON security_audits
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_security_audit();

-- Sample security audits for testing
INSERT INTO security_audits (
    type, severity, title, description, recommendation, 
    category, compliance_standard, risk_score, tags
) VALUES
(
    'authentication', 'high', 'Weak Password Policy',
    'Current password policy allows weak passwords that can be easily compromised.',
    'Implement stronger password requirements: minimum 12 characters, mixed case, numbers, and special characters.',
    'Access Control', 'HIPAA', 85, ARRAY['password', 'authentication', 'access-control']
),
(
    'data_access', 'critical', 'Unencrypted PHI Storage',
    'Patient health information is stored without encryption in the database.',
    'Implement database-level encryption for all PHI fields and ensure encryption at rest.',
    'Data Protection', 'HIPAA', 95, ARRAY['encryption', 'phi', 'data-protection']
),
(
    'api_security', 'medium', 'Missing Rate Limiting',
    'API endpoints lack rate limiting, making them vulnerable to abuse.',
    'Implement rate limiting on all API endpoints to prevent abuse and DoS attacks.',
    'API Security', 'SOC2', 60, ARRAY['rate-limiting', 'api', 'dos-protection']
),
(
    'infrastructure', 'low', 'Outdated Dependencies',
    'Several npm packages have known security vulnerabilities.',
    'Update all dependencies to their latest secure versions and implement automated dependency scanning.',
    'Infrastructure', 'SOC2', 30, ARRAY['dependencies', 'vulnerabilities', 'updates']
)
ON CONFLICT DO NOTHING;
