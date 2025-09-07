-- User Onboarding Schema for CareIQ
-- Run this in your Supabase SQL Editor

-- 1. Facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  state text NOT NULL,
  zip_code text,
  phone text,
  email text,
  license_number text,
  cms_certification_number text,
  bed_count integer,
  facility_type text DEFAULT 'skilled_nursing' CHECK (facility_type IN ('skilled_nursing', 'assisted_living', 'rehabilitation', 'memory_care', 'hospice')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT facilities_pkey PRIMARY KEY (id)
);

-- 2. Staff roles and permissions
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '{}',
  facility_id uuid REFERENCES public.facilities(id),
  is_system_role boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_roles_pkey PRIMARY KEY (id)
);

-- 3. User facility assignments
CREATE TABLE IF NOT EXISTS public.user_facility_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  role_id uuid REFERENCES public.staff_roles(id),
  is_primary boolean DEFAULT false,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  CONSTRAINT user_facility_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_facility UNIQUE (user_id, facility_id)
);

-- 4. Onboarding workflow steps
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  step_name text NOT NULL,
  step_data jsonb DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_steps_pkey PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_facilities_state ON public.facilities(state);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON public.facilities(status);
CREATE INDEX IF NOT EXISTS idx_user_facility_assignments_user_id ON public.user_facility_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facility_assignments_facility_id ON public.user_facility_assignments(facility_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user_id ON public.onboarding_steps(user_id);

-- RLS policies
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_facility_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Facilities policies
CREATE POLICY "facilities_select_all" ON public.facilities
  FOR SELECT USING (true);

CREATE POLICY "facilities_insert_admin" ON public.facilities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'Administrator')
    )
  );

CREATE POLICY "facilities_update_admin" ON public.facilities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'Administrator')
    )
  );

-- Staff roles policies
CREATE POLICY "staff_roles_select_all" ON public.staff_roles
  FOR SELECT USING (true);

CREATE POLICY "staff_roles_insert_admin" ON public.staff_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'Administrator')
    )
  );

-- User facility assignments policies
CREATE POLICY "user_facility_assignments_select_own" ON public.user_facility_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_facility_assignments_insert_admin" ON public.user_facility_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR role = 'Administrator')
    )
  );

-- Onboarding steps policies
CREATE POLICY "onboarding_steps_select_own" ON public.onboarding_steps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "onboarding_steps_insert_own" ON public.onboarding_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "onboarding_steps_update_own" ON public.onboarding_steps
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert default system roles
INSERT INTO public.staff_roles (name, description, permissions, is_system_role) VALUES
  ('Administrator', 'Full system access and user management', '{"all": true}', true),
  ('Facility Administrator', 'Facility-level administration and user management', '{"facility_admin": true, "user_management": true, "reports": true}', true),
  ('Director of Nursing', 'Nursing department leadership and oversight', '{"nursing_oversight": true, "staff_management": true, "compliance": true}', true),
  ('Nurse Manager', 'Nursing staff management and scheduling', '{"staff_management": true, "scheduling": true, "patient_care": true}', true),
  ('Registered Nurse', 'Direct patient care and documentation', '{"patient_care": true, "documentation": true, "medication_administration": true}', true),
  ('Licensed Practical Nurse', 'Patient care under RN supervision', '{"patient_care": true, "documentation": true, "medication_administration": true}', true),
  ('Certified Nursing Assistant', 'Direct patient care and assistance', '{"patient_care": true, "basic_documentation": true}', true),
  ('Social Worker', 'Patient and family support services', '{"social_services": true, "discharge_planning": true, "family_communication": true}', true),
  ('Activities Director', 'Patient activities and recreation', '{"activities": true, "patient_engagement": true}', true),
  ('Dietary Manager', 'Nutrition and meal planning', '{"dietary": true, "nutrition_planning": true}', true),
  ('Maintenance', 'Facility maintenance and repairs', '{"maintenance": true, "safety": true}', true),
  ('Housekeeping', 'Facility cleanliness and sanitation', '{"housekeeping": true, "infection_control": true}', true)
ON CONFLICT (name) DO NOTHING;
