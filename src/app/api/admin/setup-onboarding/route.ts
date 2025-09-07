import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supa = supabaseService();

    // Create facilities table
    await supa.rpc('exec_sql', {
      sql: `
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
      `
    });

    // Create staff roles table
    await supa.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.staff_roles (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          name text NOT NULL,
          description text,
          permissions jsonb DEFAULT '{}',
          facility_id uuid REFERENCES public.facilities(id),
          is_system_role boolean DEFAULT false,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT staff_roles_pkey PRIMARY KEY (id)
        );
      `
    });

    // Create user facility assignments table
    await supa.rpc('exec_sql', {
      sql: `
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
      `
    });

    // Create onboarding steps table
    await supa.rpc('exec_sql', {
      sql: `
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
      `
    });

    // Insert default system roles
    await supa.rpc('exec_sql', {
      sql: `
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
      `
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'User onboarding schema setup completed successfully' 
    });
  } catch (error: any) {
    console.error('Setup onboarding error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
