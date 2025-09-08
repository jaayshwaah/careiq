-- Safe Schema Setup for CareIQ
-- Handles existing tables gracefully

-- =====================================================
-- SURVEY WINDOWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS survey_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    facility_id UUID,
    facility_state TEXT NOT NULL,
    last_survey_date DATE NOT NULL,
    window_start DATE NOT NULL,
    window_end DATE NOT NULL,
    days_until_window INTEGER,
    days_until_expiry INTEGER,
    is_in_window BOOLEAN DEFAULT FALSE,
    is_overdue BOOLEAN DEFAULT FALSE,
    state_description TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'survey_windows_user_id_key') THEN
        ALTER TABLE survey_windows ADD CONSTRAINT survey_windows_user_id_key UNIQUE(user_id);
    END IF;
END $$;

-- RLS for survey windows
ALTER TABLE survey_windows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own survey windows" ON survey_windows;

-- Create new policy
CREATE POLICY "Users can manage their own survey windows" ON survey_windows
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- CENSUS TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS census_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID,
    date DATE NOT NULL,
    total_beds INTEGER NOT NULL DEFAULT 0,
    occupied_beds INTEGER NOT NULL DEFAULT 0,
    available_beds INTEGER NOT NULL DEFAULT 0,
    occupancy_rate DECIMAL(5,2) DEFAULT 0.00,
    admission_count INTEGER DEFAULT 0,
    discharge_count INTEGER DEFAULT 0,
    private_pay_count INTEGER DEFAULT 0,
    medicare_count INTEGER DEFAULT 0,
    medicaid_count INTEGER DEFAULT 0,
    insurance_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual',
    sync_status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'census_snapshots_facility_date_key') THEN
        ALTER TABLE census_snapshots ADD CONSTRAINT census_snapshots_facility_date_key UNIQUE(facility_id, date);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS census_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID,
    sync_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    sync_duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for census tables
ALTER TABLE census_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON census_snapshots;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON census_snapshots;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON census_snapshots;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON census_sync_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON census_sync_logs;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON census_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON census_snapshots
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON census_snapshots
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON census_sync_logs
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON census_sync_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- SUPPLY MANAGEMENT TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS supply_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_categories_name_key') THEN
        ALTER TABLE supply_categories ADD CONSTRAINT supply_categories_name_key UNIQUE(name);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS supply_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES supply_categories(id) ON DELETE SET NULL,
    unit_of_measure TEXT DEFAULT 'each',
    barcode TEXT,
    cost_per_unit DECIMAL(10,2),
    reorder_level INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraints only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_items_sku_key') THEN
        ALTER TABLE supply_items ADD CONSTRAINT supply_items_sku_key UNIQUE(sku);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_items_barcode_key') THEN
        ALTER TABLE supply_items ADD CONSTRAINT supply_items_barcode_key UNIQUE(barcode);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS facility_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit_code TEXT NOT NULL,
    unit_type TEXT DEFAULT 'general',
    floor_number INTEGER,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_units_unit_code_key') THEN
        ALTER TABLE facility_units ADD CONSTRAINT facility_units_unit_code_key UNIQUE(unit_code);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS supply_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES supply_items(id) ON DELETE CASCADE NOT NULL,
    location_type TEXT NOT NULL CHECK (location_type IN ('central_supply', 'unit_stock')),
    location_id UUID REFERENCES facility_units(id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_stock_item_location_key') THEN
        ALTER TABLE supply_stock ADD CONSTRAINT supply_stock_item_location_key UNIQUE(item_id, location_type, location_id);
    END IF;
END $$;

-- Create enum types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('stock_in', 'stock_out', 'transfer', 'adjustment');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS supply_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES supply_items(id) ON DELETE CASCADE NOT NULL,
    transaction_type transaction_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    from_location_type TEXT CHECK (from_location_type IN ('central_supply', 'unit_stock')),
    from_location_id UUID REFERENCES facility_units(id) ON DELETE CASCADE,
    to_location_type TEXT CHECK (to_location_type IN ('central_supply', 'unit_stock')),
    to_location_id UUID REFERENCES facility_units(id) ON DELETE CASCADE,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference_number TEXT,
    notes TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TASK MANAGEMENT TABLES (NetSuite-like)
-- =====================================================

-- Create enum types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_trigger_type') THEN
        CREATE TYPE workflow_trigger_type AS ENUM ('manual', 'event', 'scheduled', 'conditional');
    END IF;
END $$;

-- Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    default_priority task_priority DEFAULT 'medium',
    estimated_duration_minutes INTEGER,
    instructions TEXT,
    checklist_items JSONB DEFAULT '[]',
    required_fields JSONB DEFAULT '[]',
    auto_assign_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_templates_name_key') THEN
        ALTER TABLE task_templates ADD CONSTRAINT task_templates_name_key UNIQUE(name);
    END IF;
END $$;

-- Task Workflows (NetSuite-like automation)
CREATE TABLE IF NOT EXISTS task_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type workflow_trigger_type DEFAULT 'manual',
    trigger_conditions JSONB DEFAULT '{}',
    workflow_steps JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_workflows_name_key') THEN
        ALTER TABLE task_workflows ADD CONSTRAINT task_workflows_name_key UNIQUE(name);
    END IF;
END $$;

-- Main Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    category TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timing
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Workflow Integration
    workflow_id UUID REFERENCES task_workflows(id) ON DELETE SET NULL,
    workflow_step_number INTEGER,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
    
    -- Data
    task_data JSONB DEFAULT '{}',
    checklist_progress JSONB DEFAULT '{}',
    completion_notes TEXT,
    
    -- Automation
    is_automated BOOLEAN DEFAULT FALSE,
    auto_created BOOLEAN DEFAULT FALSE,
    trigger_event TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    dependency_type TEXT DEFAULT 'finish_to_start',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_dependencies_task_depends_key') THEN
        ALTER TABLE task_dependencies ADD CONSTRAINT task_dependencies_task_depends_key UNIQUE(task_id, depends_on_task_id);
    END IF;
END $$;

-- Task Comments/Updates
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment', -- 'comment', 'status_change', 'assignment', 'system'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task Workflow Executions (track automation runs)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES task_workflows(id) ON DELETE CASCADE NOT NULL,
    trigger_event TEXT,
    trigger_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    created_tasks JSONB DEFAULT '[]',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Supply tables
ALTER TABLE supply_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_transactions ENABLE ROW LEVEL SECURITY;

-- Task tables
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
-- Supply policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON supply_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON supply_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON supply_categories;

CREATE POLICY "Enable read access for authenticated users" ON supply_categories
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON supply_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON supply_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Continue with other tables' policies...
-- (Similar pattern for all other tables)

-- =====================================================
-- SAMPLE DATA INSERTS (SAFE)
-- =====================================================

-- Supply Categories (with safe inserts)
INSERT INTO supply_categories (name, description, color) 
SELECT 'Medical Supplies', 'General medical supplies and equipment', '#10B981'
WHERE NOT EXISTS (SELECT 1 FROM supply_categories WHERE name = 'Medical Supplies');

INSERT INTO supply_categories (name, description, color) 
SELECT 'Medications', 'Pharmaceutical products', '#EF4444'
WHERE NOT EXISTS (SELECT 1 FROM supply_categories WHERE name = 'Medications');

INSERT INTO supply_categories (name, description, color) 
SELECT 'PPE', 'Personal protective equipment', '#F59E0B'
WHERE NOT EXISTS (SELECT 1 FROM supply_categories WHERE name = 'PPE');

INSERT INTO supply_categories (name, description, color) 
SELECT 'Cleaning Supplies', 'Cleaning and sanitation products', '#3B82F6'
WHERE NOT EXISTS (SELECT 1 FROM supply_categories WHERE name = 'Cleaning Supplies');

INSERT INTO supply_categories (name, description, color) 
SELECT 'Office Supplies', 'Administrative and office materials', '#8B5CF6'
WHERE NOT EXISTS (SELECT 1 FROM supply_categories WHERE name = 'Office Supplies');

INSERT INTO supply_categories (name, description, color) 
SELECT 'Dietary', 'Food service and kitchen supplies', '#06B6D4'
WHERE NOT EXISTS (SELECT 1 FROM supply_categories WHERE name = 'Dietary');

-- Facility Units (with safe inserts)
INSERT INTO facility_units (name, unit_code, unit_type, floor_number, capacity) 
SELECT 'Central Supply', 'CS', 'supply', 1, NULL
WHERE NOT EXISTS (SELECT 1 FROM facility_units WHERE unit_code = 'CS');

INSERT INTO facility_units (name, unit_code, unit_type, floor_number, capacity) 
SELECT 'Memory Care Unit', 'MCU', 'residential', 2, 24
WHERE NOT EXISTS (SELECT 1 FROM facility_units WHERE unit_code = 'MCU');

INSERT INTO facility_units (name, unit_code, unit_type, floor_number, capacity) 
SELECT 'Skilled Nursing Unit A', 'SNA', 'skilled', 1, 30
WHERE NOT EXISTS (SELECT 1 FROM facility_units WHERE unit_code = 'SNA');

INSERT INTO facility_units (name, unit_code, unit_type, floor_number, capacity) 
SELECT 'Skilled Nursing Unit B', 'SNB', 'skilled', 2, 30
WHERE NOT EXISTS (SELECT 1 FROM facility_units WHERE unit_code = 'SNB');

INSERT INTO facility_units (name, unit_code, unit_type, floor_number, capacity) 
SELECT 'Rehabilitation Unit', 'REHAB', 'rehabilitation', 1, 20
WHERE NOT EXISTS (SELECT 1 FROM facility_units WHERE unit_code = 'REHAB');

INSERT INTO facility_units (name, unit_code, unit_type, floor_number, capacity) 
SELECT 'Administration', 'ADMIN', 'office', 3, NULL
WHERE NOT EXISTS (SELECT 1 FROM facility_units WHERE unit_code = 'ADMIN');

-- Task Templates (with safe inserts)
INSERT INTO task_templates (name, description, category, default_priority, estimated_duration_minutes, instructions, checklist_items) 
SELECT 
    'New Admission - Nursing Assessment',
    'Complete initial nursing assessment for new resident',
    'clinical',
    'high',
    60,
    'Conduct comprehensive nursing assessment within 24 hours of admission',
    '["Vital signs assessment", "Medical history review", "Medication reconciliation", "Fall risk assessment", "Nutritional screening", "Document all findings in EHR"]'
WHERE NOT EXISTS (SELECT 1 FROM task_templates WHERE name = 'New Admission - Nursing Assessment');

INSERT INTO task_templates (name, description, category, default_priority, estimated_duration_minutes, instructions, checklist_items) 
SELECT
    'New Admission - Room Preparation',
    'Prepare resident room for new admission',
    'housekeeping',
    'high',
    30,
    'Ensure room is clean, stocked, and ready for new resident',
    '["Clean and sanitize room", "Check bed and equipment", "Stock supplies", "Verify call light works", "Place welcome packet"]'
WHERE NOT EXISTS (SELECT 1 FROM task_templates WHERE name = 'New Admission - Room Preparation');

INSERT INTO task_templates (name, description, category, default_priority, estimated_duration_minutes, instructions, checklist_items) 
SELECT
    'New Admission - Dietary Assessment',
    'Complete dietary assessment and plan',
    'dietary',
    'medium',
    45,
    'Assess nutritional needs and create meal plan',
    '["Review dietary restrictions", "Assess swallowing ability", "Create initial meal plan", "Document preferences", "Schedule follow-up"]'
WHERE NOT EXISTS (SELECT 1 FROM task_templates WHERE name = 'New Admission - Dietary Assessment');

-- Task Workflow (with safe insert)
INSERT INTO task_workflows (name, description, trigger_type, trigger_conditions, workflow_steps) 
SELECT
    'New Resident Admission Workflow',
    'Automated task creation for new resident admissions',
    'event',
    '{"event_type": "new_admission", "trigger_source": "admissions_system"}',
    '[
        {
            "step_number": 1,
            "step_type": "create_task",
            "template_id": "room_prep",
            "assign_to_role": "housekeeping",
            "due_offset_hours": 2,
            "parallel": true
        },
        {
            "step_number": 2,
            "step_type": "create_task", 
            "template_id": "nursing_assessment",
            "assign_to_role": "nursing",
            "due_offset_hours": 24,
            "depends_on": []
        },
        {
            "step_number": 3,
            "step_type": "create_task",
            "template_id": "dietary_assessment", 
            "assign_to_role": "dietary",
            "due_offset_hours": 48,
            "depends_on": ["nursing_assessment"]
        }
    ]'
WHERE NOT EXISTS (SELECT 1 FROM task_workflows WHERE name = 'New Resident Admission Workflow');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_supply_transactions_item ON supply_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_supply_transactions_date ON supply_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_supply_stock_item_location ON supply_stock(item_id, location_type, location_id);

CREATE INDEX IF NOT EXISTS idx_census_snapshots_facility_date ON census_snapshots(facility_id, date);
CREATE INDEX IF NOT EXISTS idx_census_sync_logs_facility ON census_sync_logs(facility_id);
