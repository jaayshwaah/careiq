-- Complete Admin Features Schema
-- Facilities, Error Logs, Audit Logs, Billing, Support Tickets, Scheduled Jobs

-- =====================================================
-- FACILITIES MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  state TEXT NOT NULL,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Facility details
  license_number TEXT,
  bed_count INTEGER DEFAULT 0,
  facility_type TEXT DEFAULT 'nursing_home', -- nursing_home, assisted_living, memory_care
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT,
  
  -- Subscription & Billing
  subscription_tier TEXT DEFAULT 'starter', -- starter, professional, enterprise
  subscription_status TEXT DEFAULT 'trial', -- trial, active, past_due, canceled
  trial_ends_at TIMESTAMPTZ,
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
  monthly_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Features enabled
  features_enabled JSONB DEFAULT '[]'::jsonb,
  max_users INTEGER DEFAULT 10,
  ai_requests_limit INTEGER DEFAULT 1000,
  storage_limit_gb INTEGER DEFAULT 10,
  
  -- Usage tracking
  current_users INTEGER DEFAULT 0,
  ai_requests_used INTEGER DEFAULT 0,
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  
  -- Admin notes
  notes TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  onboarded_at TIMESTAMPTZ,
  onboarded_by UUID REFERENCES auth.users(id)
);

-- Link profiles to facilities
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id);

-- RLS for facilities
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all facilities"
ON public.facilities FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

CREATE POLICY "Users can view their own facility"
ON public.facilities FOR SELECT
USING (
  id IN (
    SELECT facility_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- =====================================================
-- ERROR LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Error details
  error_type TEXT NOT NULL, -- api_error, client_error, database_error, ai_error
  severity TEXT NOT NULL, -- low, medium, high, critical
  message TEXT NOT NULL,
  stack_trace TEXT,
  error_code TEXT,
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  facility_id UUID REFERENCES public.facilities(id),
  endpoint TEXT,
  method TEXT,
  request_body JSONB,
  response_body JSONB,
  user_agent TEXT,
  ip_address TEXT,
  
  -- Metadata
  environment TEXT DEFAULT 'production',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Grouping (for deduplication)
  error_hash TEXT,
  occurrence_count INTEGER DEFAULT 1,
  first_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX idx_error_logs_user ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_facility ON public.error_logs(facility_id);
CREATE INDEX idx_error_logs_hash ON public.error_logs(error_hash);
CREATE INDEX idx_error_logs_created ON public.error_logs(created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs"
ON public.error_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who & What
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL, -- login, logout, create_user, update_facility, delete_document, etc.
  entity_type TEXT, -- user, facility, document, chat, etc.
  entity_id TEXT,
  
  -- Details
  description TEXT,
  changes JSONB, -- before/after values
  metadata JSONB,
  
  -- Context
  facility_id UUID REFERENCES public.facilities(id),
  ip_address TEXT,
  user_agent TEXT,
  
  -- PHI Access (for HIPAA compliance)
  is_phi_access BOOLEAN DEFAULT FALSE,
  phi_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_facility ON public.audit_logs(facility_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_phi ON public.audit_logs(is_phi_access) WHERE is_phi_access = TRUE;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

-- =====================================================
-- BILLING & INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) NOT NULL,
  
  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- pending, paid, overdue, canceled
  
  -- Line items
  line_items JSONB DEFAULT '[]'::jsonb,
  
  -- Billing period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  -- Payment
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- stripe, check, wire
  stripe_invoice_id TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_facility ON public.invoices(facility_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
ON public.invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

CREATE POLICY "Facility admins can view own invoices"
ON public.invoices FOR SELECT
USING (
  facility_id IN (
    SELECT facility_id FROM public.profiles
    WHERE id = auth.uid()
    AND role LIKE '%administrator%'
  )
);

-- =====================================================
-- SUPPORT TICKETS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  
  -- Ticket details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'open', -- open, in_progress, waiting_on_customer, resolved, closed
  category TEXT, -- technical, billing, feature_request, bug, other
  
  -- Participants
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  facility_id UUID REFERENCES public.facilities(id),
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- internal notes vs customer-visible
  
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_tickets_facility ON public.support_tickets(facility_id);
CREATE INDEX idx_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON public.support_tickets(created_by);

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (
  created_by = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

CREATE POLICY "Users can view ticket comments"
ON public.ticket_comments FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE created_by = auth.uid() OR assigned_to = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

CREATE POLICY "Users can add comments to tickets"
ON public.ticket_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE created_by = auth.uid() OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'administrator')
    )
  )
);

-- =====================================================
-- SCHEDULED JOBS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job details
  name TEXT NOT NULL,
  description TEXT,
  job_type TEXT NOT NULL, -- weekly_suggestions, daily_backup, monthly_invoice, etc.
  schedule TEXT NOT NULL, -- cron expression
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT, -- success, failed, running
  last_run_duration_ms INTEGER,
  last_run_error TEXT,
  
  -- Stats
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  
  -- Configuration
  config JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.scheduled_jobs(id) ON DELETE CASCADE NOT NULL,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL, -- running, success, failed
  duration_ms INTEGER,
  error_message TEXT,
  result JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_enabled ON public.scheduled_jobs(enabled);
CREATE INDEX idx_scheduled_jobs_next_run ON public.scheduled_jobs(next_run_at);
CREATE INDEX idx_job_executions_job ON public.job_executions(job_id);
CREATE INDEX idx_job_executions_status ON public.job_executions(status);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled jobs"
ON public.scheduled_jobs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

CREATE POLICY "Admins can view job executions"
ON public.job_executions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT, -- general, ai, features, email, etc.
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description, category) VALUES
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'general'),
  ('default_ai_model', '"gpt-4o-mini"', 'Default AI model for chat', 'ai'),
  ('ai_rate_limit_per_user', '100', 'Max AI requests per user per hour', 'ai'),
  ('features_enabled', '["chat", "knowledge_base", "daily_rounds", "care_plans"]', 'Globally enabled features', 'features'),
  ('email_notifications_enabled', 'true', 'Enable email notifications', 'email'),
  ('system_announcement', '""', 'System-wide announcement banner', 'general')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings"
ON public.system_settings FOR SELECT
USING (TRUE);

CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

-- =====================================================
-- FEATURE FLAGS (per facility)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id),
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(facility_id, feature_key)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own facility feature flags"
ON public.feature_flags FOR SELECT
USING (
  facility_id IN (
    SELECT facility_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all feature flags"
ON public.feature_flags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR role = 'administrator')
  )
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(NEXTVAL('ticket_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

CREATE TRIGGER set_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
WHEN (NEW.ticket_number IS NULL)
EXECUTE FUNCTION generate_ticket_number();

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TRIGGER set_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL)
EXECUTE FUNCTION generate_invoice_number();

-- Update facilities updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.facilities IS 'Client facilities/organizations using CareIQ';
COMMENT ON TABLE public.error_logs IS 'System error logging and monitoring';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for compliance and security';
COMMENT ON TABLE public.invoices IS 'Billing and invoicing for facilities';
COMMENT ON TABLE public.support_tickets IS 'Customer support ticketing system';
COMMENT ON TABLE public.scheduled_jobs IS 'Cron job management and monitoring';
COMMENT ON TABLE public.system_settings IS 'Global system configuration';


