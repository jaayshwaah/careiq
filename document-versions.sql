-- Document versioning and AI editing system
-- This extends the existing knowledge_base table with version tracking

-- Document versions table for tracking edits and AI suggestions
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    changes_made TEXT, -- Summary of what was changed
    edited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- AI-specific fields
    ai_suggestions JSONB DEFAULT '[]', -- Array of AI improvement suggestions
    ai_edit_prompt TEXT, -- The original editing instruction
    ai_confidence DECIMAL(3,2), -- AI confidence score (0.00-1.00)
    
    -- Approval workflow
    approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Compliance tracking
    compliance_flags JSONB DEFAULT '[]', -- Array of compliance issues flagged
    requires_review BOOLEAN DEFAULT false,
    hipaa_reviewed BOOLEAN DEFAULT false,
    
    -- Version metadata
    is_current_version BOOLEAN DEFAULT false,
    parent_version_id UUID REFERENCES document_versions(id),
    
    UNIQUE(document_id, version_number)
);

-- Add indexes for performance
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_approval_status ON document_versions(approval_status);
CREATE INDEX idx_document_versions_current ON document_versions(document_id) WHERE is_current_version = true;

-- Add version tracking to existing knowledge_base table
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES document_versions(id),
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS requires_hipaa_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hipaa_compliant BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reviewed_by UUID REFERENCES auth.users(id);

-- Document access audit log for HIPAA compliance
CREATE TABLE IF NOT EXISTS document_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES knowledge_base(id),
    version_id UUID REFERENCES document_versions(id),
    accessed_by UUID REFERENCES auth.users(id),
    access_type TEXT CHECK (access_type IN ('view', 'edit', 'download', 'delete', 'ai_edit')),
    ip_address INET,
    user_agent TEXT,
    facility_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_accessed_by ON document_access_log(accessed_by);
CREATE INDEX idx_document_access_log_created_at ON document_access_log(created_at);

-- Function to create a new document version
CREATE OR REPLACE FUNCTION create_document_version(
    p_document_id UUID,
    p_content TEXT,
    p_changes_made TEXT,
    p_edited_by UUID,
    p_ai_suggestions JSONB DEFAULT '[]',
    p_ai_edit_prompt TEXT DEFAULT NULL,
    p_requires_review BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_version_number INTEGER;
    v_version_id UUID;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_new_version_number
    FROM document_versions
    WHERE document_id = p_document_id;
    
    -- Insert new version
    INSERT INTO document_versions (
        document_id,
        version_number,
        content,
        changes_made,
        edited_by,
        ai_suggestions,
        ai_edit_prompt,
        requires_review,
        approval_status
    ) VALUES (
        p_document_id,
        v_new_version_number,
        p_content,
        p_changes_made,
        p_edited_by,
        p_ai_suggestions,
        p_ai_edit_prompt,
        p_requires_review,
        CASE WHEN p_requires_review THEN 'pending_review' ELSE 'draft' END
    ) RETURNING id INTO v_version_id;
    
    -- Update knowledge_base with new version info
    UPDATE knowledge_base
    SET 
        version_number = v_new_version_number,
        current_version_id = v_version_id,
        last_updated = NOW()
    WHERE id = p_document_id;
    
    RETURN v_version_id;
END;
$$;

-- Function to approve a document version
CREATE OR REPLACE FUNCTION approve_document_version(
    p_version_id UUID,
    p_reviewed_by UUID,
    p_review_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_document_id UUID;
    v_content TEXT;
BEGIN
    -- Get version details
    SELECT document_id, content
    INTO v_document_id, v_content
    FROM document_versions
    WHERE id = p_version_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document version not found';
    END IF;
    
    -- Update version status
    UPDATE document_versions
    SET 
        approval_status = 'approved',
        reviewed_by = p_reviewed_by,
        reviewed_at = NOW(),
        review_notes = p_review_notes,
        is_current_version = true
    WHERE id = p_version_id;
    
    -- Mark other versions as not current
    UPDATE document_versions
    SET is_current_version = false
    WHERE document_id = v_document_id AND id != p_version_id;
    
    -- Update main document content
    UPDATE knowledge_base
    SET 
        content = v_content,
        current_version_id = p_version_id,
        last_reviewed_at = NOW(),
        last_reviewed_by = p_reviewed_by,
        last_updated = NOW()
    WHERE id = v_document_id;
    
    RETURN true;
END;
$$;

-- Function to log document access for HIPAA compliance
CREATE OR REPLACE FUNCTION log_document_access(
    p_document_id UUID,
    p_version_id UUID DEFAULT NULL,
    p_accessed_by UUID,
    p_access_type TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_facility_id TEXT;
BEGIN
    -- Get user's facility
    SELECT facility_id INTO v_facility_id
    FROM profiles
    WHERE user_id = p_accessed_by;
    
    INSERT INTO document_access_log (
        document_id,
        version_id,
        accessed_by,
        access_type,
        ip_address,
        user_agent,
        facility_id
    ) VALUES (
        p_document_id,
        p_version_id,
        p_accessed_by,
        p_access_type,
        p_ip_address,
        p_user_agent,
        v_facility_id
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Row Level Security policies for document versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Users can only see versions for documents from their facility
CREATE POLICY document_versions_facility_access ON document_versions
    FOR ALL
    USING (
        document_id IN (
            SELECT kb.id
            FROM knowledge_base kb
            JOIN profiles p ON p.user_id = auth.uid()
            WHERE kb.facility_id = p.facility_id OR p.is_admin = true
        )
    );

-- Document access log RLS
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Admins can see all access logs, users can see their facility's logs
CREATE POLICY document_access_log_facility ON document_access_log
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND (p.is_admin = true OR p.facility_id = facility_id)
        )
    );

-- Insert triggers to automatically log access
CREATE OR REPLACE FUNCTION trigger_log_document_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log when someone views/edits knowledge base content
    IF TG_OP = 'UPDATE' AND OLD.content != NEW.content THEN
        PERFORM log_document_access(
            NEW.id,
            NEW.current_version_id,
            auth.uid(),
            'edit',
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for knowledge_base updates
CREATE TRIGGER knowledge_base_access_log
    AFTER UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_document_access();

-- Comments for documentation
COMMENT ON TABLE document_versions IS 'Tracks all versions of documents with AI editing history and approval workflow';
COMMENT ON TABLE document_access_log IS 'HIPAA-compliant audit log of all document access for compliance reporting';
COMMENT ON COLUMN document_versions.ai_suggestions IS 'JSON array of AI-generated improvement suggestions';
COMMENT ON COLUMN document_versions.compliance_flags IS 'JSON array of potential compliance issues identified by AI';
COMMENT ON FUNCTION create_document_version IS 'Creates new document version with automatic version numbering';
COMMENT ON FUNCTION approve_document_version IS 'Approves a document version and makes it current';
COMMENT ON FUNCTION log_document_access IS 'Logs document access for HIPAA audit trail';