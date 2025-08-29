-- Census data tracking tables
-- This should be run on your Supabase database

-- Daily census snapshots
CREATE TABLE census_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID,
  date DATE NOT NULL,
  total_beds INTEGER NOT NULL,
  occupied_beds INTEGER NOT NULL,
  available_beds INTEGER NOT NULL,
  occupancy_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_beds > 0 THEN (occupied_beds::DECIMAL / total_beds::DECIMAL) * 100
      ELSE 0
    END
  ) STORED,
  admission_count INTEGER DEFAULT 0,
  discharge_count INTEGER DEFAULT 0,
  skilled_nursing_beds INTEGER DEFAULT 0,
  memory_care_beds INTEGER DEFAULT 0,
  assisted_living_beds INTEGER DEFAULT 0,
  private_pay_count INTEGER DEFAULT 0,
  medicare_count INTEGER DEFAULT 0,
  medicaid_count INTEGER DEFAULT 0,
  insurance_count INTEGER DEFAULT 0,
  source VARCHAR(50) DEFAULT 'manual', -- 'pointclickcare', 'manual', 'api'
  sync_status VARCHAR(20) DEFAULT 'success', -- 'success', 'error', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(facility_id, date)
);

-- Integration settings for different EHR systems
CREATE TABLE ehr_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID,
  ehr_system VARCHAR(50) NOT NULL, -- 'pointclickcare', 'matrixcare', 'caremerge', etc.
  api_endpoint TEXT,
  username VARCHAR(255),
  password_encrypted TEXT,
  api_key_encrypted TEXT,
  client_id VARCHAR(255),
  client_secret_encrypted TEXT,
  auth_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  sync_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  sync_time TIME DEFAULT '06:00:00', -- When to sync daily
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(facility_id, ehr_system)
);

-- Census sync logs
CREATE TABLE census_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID,
  integration_id UUID REFERENCES ehr_integrations(id),
  sync_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'partial'
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historical census trends (aggregated monthly data)
CREATE TABLE census_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID,
  month DATE NOT NULL, -- First day of month
  avg_occupancy_rate DECIMAL(5,2),
  max_occupancy_rate DECIMAL(5,2),
  min_occupancy_rate DECIMAL(5,2),
  total_admissions INTEGER DEFAULT 0,
  total_discharges INTEGER DEFAULT 0,
  avg_length_of_stay DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(facility_id, month)
);

-- Add foreign key constraints (if profiles table structure allows)
-- Note: Uncomment these lines if your profiles table has a unique constraint on facility_id
-- ALTER TABLE census_snapshots ADD CONSTRAINT fk_census_snapshots_facility 
--   FOREIGN KEY (facility_id) REFERENCES profiles(facility_id);
-- ALTER TABLE ehr_integrations ADD CONSTRAINT fk_ehr_integrations_facility 
--   FOREIGN KEY (facility_id) REFERENCES profiles(facility_id);
-- ALTER TABLE census_sync_logs ADD CONSTRAINT fk_census_sync_logs_facility 
--   FOREIGN KEY (facility_id) REFERENCES profiles(facility_id);
-- ALTER TABLE census_trends ADD CONSTRAINT fk_census_trends_facility 
--   FOREIGN KEY (facility_id) REFERENCES profiles(facility_id);

-- Alternative: Add foreign key to user_id if that's the primary relationship
-- ALTER TABLE census_snapshots ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE ehr_integrations ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- etc.

-- Indexes for performance
CREATE INDEX idx_census_snapshots_facility_date ON census_snapshots(facility_id, date DESC);
CREATE INDEX idx_census_snapshots_date ON census_snapshots(date DESC);
CREATE INDEX idx_ehr_integrations_facility ON ehr_integrations(facility_id);
CREATE INDEX idx_census_sync_logs_facility_date ON census_sync_logs(facility_id, sync_date DESC);
CREATE INDEX idx_census_trends_facility_month ON census_trends(facility_id, month DESC);

-- Row Level Security (RLS)
ALTER TABLE census_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their facility's data)
CREATE POLICY "Users can view their facility census" ON census_snapshots
  FOR SELECT USING (
    facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE user_id = auth.uid()
      AND facility_id IS NOT NULL
    )
  );

CREATE POLICY "Users can insert census data" ON census_snapshots
  FOR INSERT WITH CHECK (
    facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE user_id = auth.uid()
      AND (role LIKE '%administrator%' OR role LIKE '%manager%')
      AND facility_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update census data" ON census_snapshots
  FOR UPDATE USING (
    facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE user_id = auth.uid()
      AND (role LIKE '%administrator%' OR role LIKE '%manager%')
      AND facility_id IS NOT NULL
    )
  );

CREATE POLICY "Users can manage their facility integrations" ON ehr_integrations
  FOR ALL USING (
    facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE user_id = auth.uid()
      AND (role LIKE '%administrator%' OR role LIKE '%manager%')
      AND facility_id IS NOT NULL
    )
  );

CREATE POLICY "Users can view sync logs" ON census_sync_logs
  FOR SELECT USING (
    facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE user_id = auth.uid()
      AND facility_id IS NOT NULL
    )
  );

CREATE POLICY "Users can view census trends" ON census_trends
  FOR SELECT USING (
    facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE user_id = auth.uid()
      AND facility_id IS NOT NULL
    )
  );

-- Functions for census calculations
CREATE OR REPLACE FUNCTION calculate_occupancy_trend(
  p_facility_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  occupancy_rate DECIMAL(5,2),
  occupied_beds INTEGER,
  total_beds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.date,
    cs.occupancy_rate,
    cs.occupied_beds,
    cs.total_beds
  FROM census_snapshots cs
  WHERE cs.facility_id = p_facility_id
    AND cs.date >= CURRENT_DATE - INTERVAL '%s days' USING p_days
  ORDER BY cs.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;