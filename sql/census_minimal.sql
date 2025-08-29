-- Minimal Census Schema (no role dependencies)
-- This version should work without any profile table dependencies

-- Daily census snapshots
CREATE TABLE census_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(), -- Direct reference to authenticated user
  facility_id TEXT, -- Can be set to any facility identifier
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
  source VARCHAR(50) DEFAULT 'manual',
  sync_status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(facility_id, date)
);

-- EHR integration settings
CREATE TABLE ehr_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  facility_id TEXT,
  ehr_system VARCHAR(50) NOT NULL,
  api_endpoint TEXT,
  username VARCHAR(255),
  password_encrypted TEXT,
  api_key_encrypted TEXT,
  client_id VARCHAR(255),
  client_secret_encrypted TEXT,
  auth_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  sync_frequency VARCHAR(20) DEFAULT 'daily',
  sync_time TIME DEFAULT '06:00:00',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ehr_system)
);

-- Sync logs
CREATE TABLE census_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  facility_id TEXT,
  integration_id UUID,
  sync_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly trends
CREATE TABLE census_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  facility_id TEXT,
  month DATE NOT NULL,
  avg_occupancy_rate DECIMAL(5,2),
  max_occupancy_rate DECIMAL(5,2),
  min_occupancy_rate DECIMAL(5,2),
  total_admissions INTEGER DEFAULT 0,
  total_discharges INTEGER DEFAULT 0,
  avg_length_of_stay DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, facility_id, month)
);

-- Indexes
CREATE INDEX idx_census_snapshots_user_date ON census_snapshots(user_id, date DESC);
CREATE INDEX idx_census_snapshots_facility_date ON census_snapshots(facility_id, date DESC);
CREATE INDEX idx_ehr_integrations_user ON ehr_integrations(user_id);
CREATE INDEX idx_census_sync_logs_user_date ON census_sync_logs(user_id, sync_date DESC);
CREATE INDEX idx_census_trends_user_month ON census_trends(user_id, month DESC);

-- Enable RLS
ALTER TABLE census_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_trends ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (users can only see their own data)
CREATE POLICY "Users can manage their own census data" ON census_snapshots
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own integrations" ON ehr_integrations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own sync logs" ON census_sync_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own trends" ON census_trends
  FOR ALL USING (user_id = auth.uid());

-- Sample data for testing (will be created for the current user)
INSERT INTO census_snapshots (
  facility_id, date, total_beds, occupied_beds, available_beds,
  admission_count, discharge_count, medicare_count, medicaid_count, 
  private_pay_count, insurance_count
) VALUES 
('demo-facility', CURRENT_DATE, 120, 95, 25, 2, 1, 45, 35, 10, 5),
('demo-facility', CURRENT_DATE - INTERVAL '1 day', 120, 94, 26, 1, 2, 44, 36, 10, 4),
('demo-facility', CURRENT_DATE - INTERVAL '2 days', 120, 96, 24, 3, 0, 46, 35, 11, 4),
('demo-facility', CURRENT_DATE - INTERVAL '3 days', 120, 93, 27, 1, 1, 43, 37, 9, 4),
('demo-facility', CURRENT_DATE - INTERVAL '4 days', 120, 97, 23, 2, 0, 47, 35, 11, 4);

-- Function to get occupancy trends
CREATE OR REPLACE FUNCTION get_occupancy_trend(
  p_facility_id TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  occupancy_rate DECIMAL(5,2),
  occupied_beds INTEGER,
  total_beds INTEGER,
  admissions INTEGER,
  discharges INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.date,
    cs.occupancy_rate,
    cs.occupied_beds,
    cs.total_beds,
    cs.admission_count,
    cs.discharge_count
  FROM census_snapshots cs
  WHERE cs.user_id = auth.uid()
    AND (p_facility_id IS NULL OR cs.facility_id = p_facility_id)
    AND cs.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY cs.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest census
CREATE OR REPLACE FUNCTION get_latest_census(p_facility_id TEXT DEFAULT NULL)
RETURNS TABLE (
  date DATE,
  total_beds INTEGER,
  occupied_beds INTEGER,
  available_beds INTEGER,
  occupancy_rate DECIMAL(5,2),
  admission_count INTEGER,
  discharge_count INTEGER,
  medicare_count INTEGER,
  medicaid_count INTEGER,
  private_pay_count INTEGER,
  insurance_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.date,
    cs.total_beds,
    cs.occupied_beds,
    cs.available_beds,
    cs.occupancy_rate,
    cs.admission_count,
    cs.discharge_count,
    cs.medicare_count,
    cs.medicaid_count,
    cs.private_pay_count,
    cs.insurance_count
  FROM census_snapshots cs
  WHERE cs.user_id = auth.uid()
    AND (p_facility_id IS NULL OR cs.facility_id = p_facility_id)
  ORDER BY cs.date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;