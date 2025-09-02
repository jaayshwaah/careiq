-- Migration for client onboarding system tables
-- Simplified version that doesn't modify existing enums

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

-- Add missing columns to facilities table if they don't exist
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'status') THEN
    ALTER TABLE facilities ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'inactive', 'suspended'));
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'created_at') THEN
    ALTER TABLE facilities ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'updated_at') THEN
    ALTER TABLE facilities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add RLS policies for facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for better performance (with defensive checks)
DO $$
BEGIN
    -- Only create index if status column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(status);
    END IF;
    
    -- Create other indexes
    CREATE INDEX IF NOT EXISTS idx_facilities_facility_type ON facilities(facility_type);
    CREATE INDEX IF NOT EXISTS idx_facility_documents_facility_id ON facility_documents(facility_id);
    CREATE INDEX IF NOT EXISTS idx_facility_settings_facility_id ON facility_settings(facility_id);
    
    -- Only create profiles index if facility_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'facility_id') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_facility_id ON profiles(facility_id);
    END IF;
END $$;

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