-- AI Features and Advanced Integrations Schema
-- This extends the existing schema with new AI capabilities

-- Document Analysis Table
CREATE TABLE IF NOT EXISTS document_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('compliance', 'policy', 'assessment', 'training', 'comprehensive')),
    content_preview TEXT,
    analysis_result JSONB NOT NULL,
    facility_context JSONB,
    processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Survey Predictions Table
CREATE TABLE IF NOT EXISTS survey_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    facility_data JSONB NOT NULL,
    historical_data JSONB,
    current_metrics JSONB,
    prediction_result JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance Monitoring Table
CREATE TABLE IF NOT EXISTS compliance_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monitoring_period TEXT NOT NULL CHECK (monitoring_period IN ('daily', 'weekly', 'monthly')),
    data_sources JSONB NOT NULL,
    alert_thresholds JSONB,
    analysis_result JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CMS Regulations Table (for the CMS guidance system)
CREATE TABLE IF NOT EXISTS cms_regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    f_tag TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    scope TEXT NOT NULL,
    last_updated DATE NOT NULL,
    tags TEXT[] DEFAULT '{}',
    requirements TEXT[] DEFAULT '{}',
    consequences TEXT,
    best_practices TEXT[] DEFAULT '{}',
    related_regulations TEXT[] DEFAULT '{}',
    implementation_steps TEXT[] DEFAULT '{}',
    monitoring_requirements TEXT[] DEFAULT '{}',
    documentation_requirements TEXT[] DEFAULT '{}',
    common_deficiencies TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance Updates Table
CREATE TABLE IF NOT EXISTS compliance_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    update_type TEXT NOT NULL CHECK (update_type IN ('regulation', 'guidance', 'policy', 'alert')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    effective_date DATE NOT NULL,
    affected_regulations TEXT[] DEFAULT '{}',
    summary TEXT NOT NULL,
    full_text TEXT,
    source_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance Resources Table
CREATE TABLE IF NOT EXISTS compliance_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('manual', 'guidance', 'tool', 'template', 'checklist')),
    category TEXT NOT NULL,
    file_url TEXT,
    external_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Integration Sync Logs Table
CREATE TABLE IF NOT EXISTS integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('ehr', 'census', 'staffing', 'quality', 'supply')),
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'real_time')),
    records_processed INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial_success', 'error')),
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Residents Table (for EHR integration)
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    external_id TEXT,
    name TEXT NOT NULL,
    room_number TEXT,
    admission_date DATE,
    discharge_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'transferred')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Medications Table (for EHR integration)
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    start_date DATE,
    end_date DATE,
    prescriber TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Shifts Table (for staffing integration)
CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    role TEXT NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours_worked DECIMAL(4,2),
    unit TEXT,
    overtime BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quality Indicators Table (for quality integration)
CREATE TABLE IF NOT EXISTS quality_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id TEXT NOT NULL,
    indicator_name TEXT NOT NULL,
    indicator_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    measurement_date DATE NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_indicators ENABLE ROW LEVEL SECURITY;

-- Document Analyses Policies
CREATE POLICY "Enable read access for authenticated users" ON document_analyses
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON document_analyses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for document owners" ON document_analyses
    FOR UPDATE USING (auth.uid() = user_id);

-- Survey Predictions Policies
CREATE POLICY "Enable read access for authenticated users" ON survey_predictions
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON survey_predictions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for prediction owners" ON survey_predictions
    FOR UPDATE USING (auth.uid() = user_id);

-- Compliance Monitoring Policies
CREATE POLICY "Enable read access for authenticated users" ON compliance_monitoring
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON compliance_monitoring
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for monitoring owners" ON compliance_monitoring
    FOR UPDATE USING (auth.uid() = user_id);

-- CMS Regulations Policies
CREATE POLICY "Enable read access for authenticated users" ON cms_regulations
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON cms_regulations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON cms_regulations
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Compliance Updates Policies
CREATE POLICY "Enable read access for authenticated users" ON compliance_updates
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON compliance_updates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON compliance_updates
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Compliance Resources Policies
CREATE POLICY "Enable read access for authenticated users" ON compliance_resources
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON compliance_resources
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for resource owners" ON compliance_resources
    FOR UPDATE USING (auth.uid() = created_by);

-- Integration Sync Logs Policies
CREATE POLICY "Enable read access for authenticated users" ON integration_sync_logs
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON integration_sync_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- EHR Data Policies
CREATE POLICY "Enable read access for authenticated users" ON residents
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON residents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON residents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON medications
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON medications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON medications
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON staff_shifts
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON staff_shifts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON staff_shifts
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON quality_indicators
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON quality_indicators
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON quality_indicators
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_analyses_user_id ON document_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_document_analyses_analysis_type ON document_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_survey_predictions_user_id ON survey_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_predictions_generated_at ON survey_predictions(generated_at);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_facility_id ON compliance_monitoring(facility_id);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_period ON compliance_monitoring(monitoring_period);
CREATE INDEX IF NOT EXISTS idx_cms_regulations_f_tag ON cms_regulations(f_tag);
CREATE INDEX IF NOT EXISTS idx_cms_regulations_category ON cms_regulations(category);
CREATE INDEX IF NOT EXISTS idx_cms_regulations_severity ON cms_regulations(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_updates_type ON compliance_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_compliance_updates_date ON compliance_updates(effective_date);
CREATE INDEX IF NOT EXISTS idx_compliance_resources_type ON compliance_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_facility_id ON integration_sync_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_type ON integration_sync_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_residents_facility_id ON residents(facility_id);
CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status);
CREATE INDEX IF NOT EXISTS idx_medications_facility_id ON medications(facility_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_facility_id ON staff_shifts(facility_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_quality_indicators_facility_id ON quality_indicators(facility_id);
CREATE INDEX IF NOT EXISTS idx_quality_indicators_date ON quality_indicators(measurement_date);

-- Sample CMS Regulations Data
INSERT INTO cms_regulations (f_tag, category, title, description, severity, scope, last_updated, tags, requirements, consequences, best_practices, related_regulations, implementation_steps, monitoring_requirements, documentation_requirements, common_deficiencies) 
SELECT 
    'F-514',
    'Quality of Care',
    'Nursing Services - Sufficient Staff (F-Tag 514)',
    'Each resident must receive and the facility must provide the necessary care and services to attain or maintain the highest practicable physical, mental, and psychosocial well-being.',
    'critical',
    'All nursing home residents requiring nursing services',
    '2024-01-15',
    ARRAY['staffing', 'nursing', 'quality', 'care-planning'],
    ARRAY[
        'Provide 24-hour nursing services sufficient to meet resident needs',
        'Ensure RN supervision at least 8 consecutive hours per day, 7 days a week',
        'Maintain adequate staffing levels to meet residents'' assessed needs',
        'Have a charge nurse on each tour of duty'
    ],
    'Immediate Jeopardy potential with fines up to $21,393 per day. Can lead to termination of provider agreement.',
    ARRAY[
        'Conduct regular staffing assessments based on resident acuity',
        'Implement consistent assignment practices',
        'Maintain comprehensive orientation programs',
        'Use evidence-based staffing tools and metrics',
        'Document all staffing decisions and rationales'
    ],
    ARRAY['F-515', 'F-516', 'F-725'],
    ARRAY[
        'Assess resident needs using validated assessment tools',
        'Create staffing matrices based on census and acuity',
        'Develop contingency plans for staffing shortfalls',
        'Implement staff retention strategies'
    ],
    ARRAY[
        'Daily staffing reports and variance analysis',
        'Monthly quality indicator reviews',
        'Quarterly staffing effectiveness assessments',
        'Annual comprehensive staffing studies'
    ],
    ARRAY[
        'Daily assignment sheets with staff-to-resident ratios',
        'Nursing supervisor logs',
        'Staffing variance reports with corrective actions',
        'Competency assessments and training records'
    ],
    ARRAY[
        'Insufficient nursing staff to meet resident needs',
        'Lack of RN supervision for required hours',
        'Failure to adjust staffing based on resident acuity',
        'Inadequate documentation of staffing decisions'
    ]
WHERE NOT EXISTS (SELECT 1 FROM cms_regulations WHERE f_tag = 'F-514');

INSERT INTO cms_regulations (f_tag, category, title, description, severity, scope, last_updated, tags, requirements, consequences, best_practices, related_regulations, implementation_steps, monitoring_requirements, documentation_requirements, common_deficiencies) 
SELECT 
    'F-686',
    'Infection Control',
    'Infection Prevention and Control Program (F-Tag 686)',
    'The facility must establish and maintain an infection prevention and control program designed to provide a safe, sanitary, and comfortable environment.',
    'critical',
    'All residents, staff, and visitors',
    '2024-01-15',
    ARRAY['infection-control', 'prevention', 'safety', 'hygiene'],
    ARRAY[
        'Develop and implement written infection prevention and control policies',
        'Designate qualified infection preventionist',
        'Conduct surveillance for infections',
        'Implement appropriate isolation procedures'
    ],
    'Immediate Jeopardy potential. Can result in termination of provider agreement and civil money penalties.',
    ARRAY[
        'Regular hand hygiene training and monitoring',
        'Environmental cleaning protocols',
        'Antibiotic stewardship programs',
        'Outbreak response procedures'
    ],
    ARRAY['F-687', 'F-688', 'F-689'],
    ARRAY[
        'Appoint qualified infection preventionist',
        'Develop comprehensive IPCP policies',
        'Implement surveillance systems',
        'Train all staff on infection control'
    ],
    ARRAY[
        'Daily infection surveillance reports',
        'Monthly infection control committee meetings',
        'Quarterly antibiotic use reviews',
        'Annual infection control risk assessments'
    ],
    ARRAY[
        'Infection prevention and control policies',
        'Surveillance logs and reports',
        'Staff training records',
        'Outbreak investigation documentation'
    ],
    ARRAY[
        'Failure to implement effective infection control program',
        'Inadequate surveillance for infections',
        'Poor hand hygiene compliance',
        'Insufficient staff training on infection control'
    ]
WHERE NOT EXISTS (SELECT 1 FROM cms_regulations WHERE f_tag = 'F-686');
