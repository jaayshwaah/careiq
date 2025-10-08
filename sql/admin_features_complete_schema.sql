-- Complete Admin Features Database Schema
-- Run this in Supabase SQL Editor to enable all admin features

-- ============================================
-- SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- general, technical, billing, feature_request
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_facility ON support_tickets(facility_id);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- create, update, delete, login, logout, etc.
  entity_type TEXT, -- profiles, facilities, chats, etc.
  entity_id UUID,
  changes JSONB, -- before/after data
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_facility ON audit_logs(facility_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- ERROR LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL, -- api_error, client_error, database_error, etc.
  severity TEXT DEFAULT 'error', -- info, warning, error, critical
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_facility ON error_logs(facility_id);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);

-- ============================================
-- INVOICES/BILLING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  line_items JSONB, -- Array of {description, quantity, unit_price, total}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_facility ON invoices(facility_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);

-- ============================================
-- SCHEDULED JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL, -- cron expression
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_status TEXT, -- success, failure, running
  last_error TEXT,
  last_duration_ms INTEGER,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_enabled ON scheduled_jobs(enabled);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at);

-- ============================================
-- JOB EXECUTIONS TABLE (History of job runs)
-- ============================================
CREATE TABLE IF NOT EXISTS job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- success, failure, running
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  output JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_executions_job ON job_executions(job_id);
CREATE INDEX idx_job_executions_status ON job_executions(status);
CREATE INDEX idx_job_executions_started ON job_executions(started_at DESC);

-- ============================================
-- SYSTEM HEALTH METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'healthy', -- healthy, warning, critical
  details JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_health_metrics_name ON system_health_metrics(metric_name);
CREATE INDEX idx_system_health_metrics_recorded ON system_health_metrics(recorded_at DESC);

-- ============================================
-- ENABLE RLS (Row Level Security)
-- ============================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Admin-only access)
-- ============================================

-- Support Tickets: Users can view their own, admins can view all
CREATE POLICY "Users can view own tickets"
ON support_tickets FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

CREATE POLICY "Users can create tickets"
ON support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tickets"
ON support_tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

-- Audit Logs: Admin-only
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (TRUE); -- Allow system to log

-- Error Logs: Admin-only
CREATE POLICY "Admins can view error logs"
ON error_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

CREATE POLICY "System can insert error logs"
ON error_logs FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Admins can update error logs"
ON error_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

-- Invoices: Facility admins can view their own, CareIQ admins can view all
CREATE POLICY "Facility admins can view own invoices"
ON invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (
      is_admin = TRUE OR
      role ILIKE '%administrator%' OR
      (facility_id = invoices.facility_id AND role ILIKE '%administrator%')
    )
  )
);

CREATE POLICY "Admins can manage invoices"
ON invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR email LIKE '%@careiq.com')
  )
);

-- Scheduled Jobs & Executions: Admin-only
CREATE POLICY "Admins can manage jobs"
ON scheduled_jobs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

CREATE POLICY "Admins can view job executions"
ON job_executions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

-- System Health: Admin-only
CREATE POLICY "Admins can view system health"
ON system_health_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (is_admin = TRUE OR role ILIKE '%administrator%')
  )
);

-- ============================================
-- SEED DATA FOR SCHEDULED JOBS
-- ============================================
INSERT INTO scheduled_jobs (name, description, schedule, enabled, next_run_at) VALUES
  ('daily_analytics_aggregation', 'Aggregate daily analytics data', '0 2 * * *', TRUE, NOW() + INTERVAL '1 day'),
  ('weekly_facility_reports', 'Generate weekly facility reports', '0 8 * * 1', TRUE, NOW() + INTERVAL '1 week'),
  ('monthly_billing', 'Process monthly billing and invoices', '0 1 1 * *', TRUE, NOW() + INTERVAL '1 month'),
  ('cleanup_old_logs', 'Clean up logs older than 90 days', '0 3 * * 0', TRUE, NOW() + INTERVAL '1 week'),
  ('system_health_check', 'Check system health and send alerts', '*/15 * * * *', TRUE, NOW() + INTERVAL '15 minutes')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- UPDATE TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Admin features schema created successfully!';
  RAISE NOTICE 'Created tables: support_tickets, audit_logs, error_logs, invoices, scheduled_jobs, job_executions, system_health_metrics';
  RAISE NOTICE 'All tables have RLS enabled with appropriate policies';
END $$;

