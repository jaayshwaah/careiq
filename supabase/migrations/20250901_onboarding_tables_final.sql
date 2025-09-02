-- Migration for client onboarding system tables
-- Designed to work with existing schema

-- Add columns to existing facilities table
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS facility_type VARCHAR(50) CHECK (facility_type IN ('skilled_nursing', 'assisted_living', 'memory_care', 'independent_living')),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS medicare_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS medicaid_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'basic' CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

-- Facility settings table
CREATE TABLE IF NOT EXISTS facility_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for facilities (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t 
    JOIN pg_class c ON c.relname = t.tablename 
    WHERE t.tablename = 'facilities' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Super admins can manage all facilities" ON facilities;
DROP POLICY IF EXISTS "Facility admins can view their facility" ON facilities;

-- Super admins can do everything (using is_admin field)
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
    )
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

-- Create storage bucket for facility documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('facility-documents', 'facility-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for facility documents storage
DROP POLICY IF EXISTS "Users can upload facility documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view facility documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update facility documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete facility documents" ON storage.objects;

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

-- Create indexes for better performance (only on columns that will exist after ALTER TABLE)
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;
DROP TRIGGER IF EXISTS update_facility_documents_updated_at ON facility_documents;
DROP TRIGGER IF EXISTS update_facility_settings_updated_at ON facility_settings;

-- Create new triggers
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_documents_updated_at BEFORE UPDATE ON facility_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_settings_updated_at BEFORE UPDATE ON facility_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();