-- Chat Suggestions Schema for CareIQ
-- Pre-generated suggestions with analytics tracking

-- Chat suggestions table
CREATE TABLE IF NOT EXISTS public.chat_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  icon text NOT NULL,
  title text NOT NULL,
  text text NOT NULL,
  category text NOT NULL CHECK (category IN ('clinical', 'compliance', 'operations', 'quality', 'staffing', 'documentation')),
  priority integer NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  last_clicked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT chat_suggestions_pkey PRIMARY KEY (id)
);

-- Analytics tracking table
CREATE TABLE IF NOT EXISTS public.suggestion_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.chat_suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('impression', 'click')),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  CONSTRAINT suggestion_analytics_pkey PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_suggestions_created_at ON public.chat_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_suggestions_category ON public.chat_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_chat_suggestions_priority ON public.chat_suggestions(priority DESC);
CREATE INDEX IF NOT EXISTS idx_chat_suggestions_active ON public.chat_suggestions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_suggestion_analytics_suggestion_id ON public.suggestion_analytics(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_analytics_timestamp ON public.suggestion_analytics(timestamp DESC);

-- RLS Policies
ALTER TABLE public.chat_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_analytics ENABLE ROW LEVEL SECURITY;

-- Everyone can read active suggestions
CREATE POLICY "Anyone can view active suggestions"
ON public.chat_suggestions FOR SELECT
USING (active = true);

-- Only admins can insert/update suggestions (allow service role to bypass)
CREATE POLICY "Admins can manage suggestions"
ON public.chat_suggestions FOR ALL
USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      CAST(role AS TEXT) LIKE '%administrator%' 
      OR CAST(role AS TEXT) = 'administrator'
      OR is_admin = true
    )
  )
);

-- Users can view their own analytics
CREATE POLICY "Users can view their analytics"
ON public.suggestion_analytics FOR SELECT
USING (auth.uid() = user_id);

-- System can insert analytics (service role only)
CREATE POLICY "System can insert analytics"
ON public.suggestion_analytics FOR INSERT
WITH CHECK (true);

-- Function to increment impressions in batch
CREATE OR REPLACE FUNCTION increment_suggestion_impressions(suggestion_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_suggestions
  SET impressions = impressions + 1
  WHERE id = ANY(suggestion_ids);
END;
$$;

-- Insert initial diverse suggestions
INSERT INTO public.chat_suggestions (icon, title, text, category, priority) VALUES
  -- Clinical
  ('🏥', 'Care Plan', 'Help me create a comprehensive care plan for a new admission', 'clinical', 10),
  ('💊', 'Medications', 'Review medication administration protocols for PRN orders', 'clinical', 8),
  ('🩺', 'MDS Assessment', 'Walk me through completing an MDS assessment', 'clinical', 9),
  ('🚑', 'Fall Protocol', 'What is the proper protocol for a resident fall with injury?', 'clinical', 8),
  ('🩹', 'Wound Care', 'Create a wound care plan for a stage 3 pressure ulcer', 'clinical', 7),
  ('🧠', 'Dementia Care', 'Best practices for managing aggressive behaviors in dementia residents', 'clinical', 8),
  ('💉', 'Insulin Protocol', 'Review sliding scale insulin administration guidelines', 'clinical', 7),
  ('🫀', 'Cardiac Care', 'Care plan for a resident with CHF and fluid restrictions', 'clinical', 6),
  
  -- Compliance
  ('📋', 'Survey Prep', 'Help me prepare for an upcoming CMS survey', 'compliance', 10),
  ('⚖️', 'F-Tag 689', 'Explain F-Tag 689 requirements and how to stay compliant', 'compliance', 9),
  ('📝', 'Restraint Doc', 'What documentation is required for restraint use?', 'compliance', 8),
  ('🎯', 'Deficiency Response', 'How do I respond to a scope and severity deficiency?', 'compliance', 8),
  ('🔍', 'Mock Survey', 'Generate a mock survey checklist for our facility', 'compliance', 7),
  ('📜', 'Resident Rights', 'Review resident rights requirements under F-Tag 550', 'compliance', 7),
  ('🏛️', 'State Regs', 'What are the current state staffing requirements?', 'compliance', 6),
  ('📊', 'QAPI Program', 'Help me establish a Quality Assurance Performance Improvement program', 'compliance', 8),
  
  -- Operations
  ('👥', 'PPD Calculation', 'Calculate PPD hours for our facility', 'staffing', 9),
  ('📊', 'PBJ Corrector', 'Help me correct errors in our PBJ submission', 'operations', 8),
  ('📅', 'Staff Schedule', 'Create a fair staff schedule that meets state requirements', 'staffing', 8),
  ('💰', 'Cost Analysis', 'Analyze our supply costs and suggest reductions', 'operations', 6),
  ('📦', 'Inventory', 'Set up an efficient supply inventory management system', 'operations', 5),
  ('🔄', 'Shift Handoff', 'Create a structured shift-to-shift handoff process', 'operations', 6),
  ('📱', 'EHR Training', 'Develop a training program for our new EHR system', 'operations', 5),
  ('🚚', 'Vendor Management', 'Review and negotiate better contracts with suppliers', 'operations', 4),
  
  -- Quality
  ('📈', 'QM Improvement', 'How can we improve our quality indicator scores?', 'quality', 9),
  ('⭐', 'Star Rating', 'What steps can increase our facility star rating?', 'quality', 10),
  ('📉', 'Fall Prevention', 'Develop a comprehensive fall prevention program', 'quality', 8),
  ('🦠', 'Infection Control', 'Review infection control protocols for outbreak prevention', 'quality', 9),
  ('😊', 'Resident Satisfaction', 'Improve resident and family satisfaction scores', 'quality', 7),
  ('🎯', 'Clinical Outcomes', 'Analyze and improve clinical outcome measures', 'quality', 7),
  
  -- Staffing
  ('🎓', 'Staff Training', 'Create a comprehensive orientation program for new CNAs', 'staffing', 7),
  ('👔', 'Hiring Process', 'Streamline our nursing staff recruitment process', 'staffing', 6),
  ('📋', 'Job Descriptions', 'Update job descriptions to meet current requirements', 'staffing', 5),
  ('💼', 'Retention Plan', 'Develop a staff retention and engagement strategy', 'staffing', 7),
  ('🏆', 'Performance Review', 'Create fair performance evaluation criteria for nurses', 'staffing', 5),
  
  -- Documentation
  ('✍️', 'Progress Notes', 'Write a comprehensive weekly progress note', 'documentation', 7),
  ('📄', 'Policy Draft', 'Draft a new infection control policy', 'documentation', 6),
  ('📧', 'Family Letter', 'Help me write a professional letter to a resident family', 'documentation', 6),
  ('📑', 'Monthly Report', 'Generate a monthly clinical quality report', 'documentation', 7),
  ('📖', 'Procedure Guide', 'Create a step-by-step procedure for admissions process', 'documentation', 5)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.chat_suggestions TO authenticated;
GRANT SELECT, INSERT ON public.suggestion_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION increment_suggestion_impressions(uuid[]) TO authenticated;

COMMENT ON TABLE public.chat_suggestions IS 'Pre-generated chat suggestions with analytics tracking';
COMMENT ON TABLE public.suggestion_analytics IS 'Tracks impression and click events for suggestions';
COMMENT ON FUNCTION increment_suggestion_impressions IS 'Batch increment impression counts for displayed suggestions';

