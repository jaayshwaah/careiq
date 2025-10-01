-- Care Plans Schema
-- Comprehensive care plan management for nursing home residents

-- Care Plans Table
CREATE TABLE IF NOT EXISTS care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id TEXT NOT NULL,
    resident_name TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'comprehensive', -- 'comprehensive', 'fall_prevention', 'wound_care', 'medication_management'
    diagnosis TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    diet_restrictions TEXT[] DEFAULT '{}',
    mobility_status TEXT,
    cognitive_status TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'on_hold')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    next_review TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Care Goals Table
CREATE TABLE IF NOT EXISTS care_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID REFERENCES care_plans(id) ON DELETE CASCADE NOT NULL,
    goal_text TEXT NOT NULL,
    target_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress_notes TEXT[] DEFAULT '{}',
    interventions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Care Plan Templates
CREATE TABLE IF NOT EXISTS care_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT NOT NULL,
    template_data JSONB NOT NULL, -- Contains goals, interventions, etc.
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Care Plan Progress Notes
CREATE TABLE IF NOT EXISTS care_plan_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID REFERENCES care_plans(id) ON DELETE CASCADE NOT NULL,
    goal_id UUID REFERENCES care_goals(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type TEXT DEFAULT 'progress' CHECK (note_type IN ('progress', 'intervention', 'assessment', 'outcome')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_progress ENABLE ROW LEVEL SECURITY;

-- Care Plans Policies
CREATE POLICY "Enable read access for authenticated users" ON care_plans
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON care_plans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON care_plans
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Care Goals Policies
CREATE POLICY "Enable read access for authenticated users" ON care_goals
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON care_goals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON care_goals
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Templates Policies
CREATE POLICY "Enable read access for authenticated users" ON care_plan_templates
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON care_plan_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for template owners" ON care_plan_templates
    FOR UPDATE USING (auth.uid() = created_by);

-- Progress Notes Policies
CREATE POLICY "Enable read access for authenticated users" ON care_plan_progress
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON care_plan_progress
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_care_plans_resident ON care_plans(resident_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_status ON care_plans(status);
CREATE INDEX IF NOT EXISTS idx_care_goals_plan ON care_goals(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_goals_status ON care_goals(status);
CREATE INDEX IF NOT EXISTS idx_care_plan_progress_plan ON care_plan_progress(care_plan_id);

-- Sample Templates
INSERT INTO care_plan_templates (name, description, plan_type, template_data, is_public) 
SELECT 
    'Comprehensive Care Plan',
    'Standard comprehensive care plan template',
    'comprehensive',
    '{
        "goals": [
            {
                "goal_text": "Maintain optimal health and well-being",
                "target_date": "ongoing",
                "priority": "high",
                "interventions": ["Regular assessments", "Medication management", "Activity planning"]
            }
        ],
        "interventions": ["Daily monitoring", "Medication administration", "Activity engagement"]
    }',
    true
WHERE NOT EXISTS (SELECT 1 FROM care_plan_templates WHERE name = 'Comprehensive Care Plan');

INSERT INTO care_plan_templates (name, description, plan_type, template_data, is_public) 
SELECT 
    'Fall Prevention Plan',
    'Specialized fall prevention care plan',
    'fall_prevention',
    '{
        "goals": [
            {
                "goal_text": "Remain free from falls for 90 days",
                "target_date": "90_days",
                "priority": "critical",
                "interventions": ["Bed alarm", "Non-slip socks", "Physical therapy evaluation", "Environmental assessment"]
            }
        ],
        "interventions": ["Fall risk assessment", "Safety measures", "Mobility assistance", "Environmental modifications"]
    }',
    true
WHERE NOT EXISTS (SELECT 1 FROM care_plan_templates WHERE name = 'Fall Prevention Plan');
