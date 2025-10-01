-- CMS Guidance Schema
-- Comprehensive CMS regulations and compliance guidance

-- CMS Regulations Table
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

-- RLS Policies
ALTER TABLE cms_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_resources ENABLE ROW LEVEL SECURITY;

-- CMS Regulations Policies
DO $$ 
BEGIN
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
END $$;

-- Compliance Updates Policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON compliance_updates;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON compliance_updates;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON compliance_updates;
    
    -- Create new policies
    CREATE POLICY "Enable read access for authenticated users" ON compliance_updates
        FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable insert for authenticated users" ON compliance_updates
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Enable update for authenticated users" ON compliance_updates
        FOR UPDATE USING (auth.role() = 'authenticated');
END $$;

-- Compliance Resources Policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON compliance_resources;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON compliance_resources;
    DROP POLICY IF EXISTS "Enable update for resource owners" ON compliance_resources;
    
    -- Create new policies
    CREATE POLICY "Enable read access for authenticated users" ON compliance_resources
        FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "Enable insert for authenticated users" ON compliance_resources
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Enable update for resource owners" ON compliance_resources
        FOR UPDATE USING (auth.uid() = created_by);
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cms_regulations_f_tag ON cms_regulations(f_tag);
CREATE INDEX IF NOT EXISTS idx_cms_regulations_category ON cms_regulations(category);
CREATE INDEX IF NOT EXISTS idx_cms_regulations_severity ON cms_regulations(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_updates_type ON compliance_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_compliance_updates_date ON compliance_updates(effective_date);
CREATE INDEX IF NOT EXISTS idx_compliance_resources_type ON compliance_resources(resource_type);

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
