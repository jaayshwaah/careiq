-- Migration for client onboarding system tables

-- Add required role values if they don't exist
-- Each enum value must be added in a separate statement that can be committed

-- Add facility_admin if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'facility_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
      ALTER TYPE user_role ADD VALUE 'facility_admin';
    END IF;
  END IF;
END $$;

-- Add careiq_admin if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'careiq_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
      ALTER TYPE user_role ADD VALUE 'careiq_admin';
    END IF;
  END IF;
END $$;

-- Add admin if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
      ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
  END IF;
END $$;

-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(50) NOT NULL CHECK (facility_type IN ('skilled_nursing', 'assisted_living', 'memory_care', 'independent_living')),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  medicare_number VARCHAR(50),
  medicaid_number VARCHAR(50),
  bed_count INTEGER NOT NULL DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  contract_start_date DATE,
  contract_end_date DATE,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all facilities" ON facilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Facility admins can only see their own facility
CREATE POLICY "Facility admins can view their facility" ON facilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.facility_id = facilities.id
      AND profiles.role = 'facility_admin'
    )
  );

-- Facility documents table
CREATE TABLE IF NOT EXISTS facility_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for facility documents
ALTER TABLE facility_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents for their facility" ON facility_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (
        profiles.is_admin = true OR
        profiles.facility_id = facility_documents.facility_id
      )
    )
  );

-- Facility settings table
CREATE TABLE IF NOT EXISTS facility_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for facility settings
ALTER TABLE facility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage settings for their facility" ON facility_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (
        profiles.is_admin = true OR
        profiles.facility_id = facility_settings.facility_id
      )
    )
  );

-- Update profiles table to include facility_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'facility_id') THEN
    ALTER TABLE profiles ADD COLUMN facility_id UUID REFERENCES facilities(id);
  END IF;
END $$;

-- Create storage bucket for facility documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('facility-documents', 'facility-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for facility documents storage
CREATE POLICY "Users can upload facility documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'facility-documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view facility documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'facility-documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update facility documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'facility-documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete facility documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'facility-documents' AND
    auth.role() = 'authenticated'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(status);
CREATE INDEX IF NOT EXISTS idx_facilities_facility_type ON facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_facility_documents_facility_id ON facility_documents(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_settings_facility_id ON facility_settings(facility_id);
CREATE INDEX IF NOT EXISTS idx_profiles_facility_id ON profiles(facility_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_documents_updated_at BEFORE UPDATE ON facility_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_settings_updated_at BEFORE UPDATE ON facility_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();