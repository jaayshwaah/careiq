-- Training System Database Tables
-- Run this in your Supabase SQL Editor

-- Training Sessions (replaces hardcoded data)
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}', -- Questions, materials, etc.
  category TEXT NOT NULL DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'intermediate', -- beginner, intermediate, advanced
  estimated_time TEXT,
  passing_score INTEGER NOT NULL DEFAULT 80,
  questions_count INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 100,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Progress (already exists but let's ensure columns)
-- ALTER TABLE training_progress ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}';

-- Training Results (already exists - looks good)

-- Training Certificates (already exists - looks good) 

-- Training Analytics (new table for insights)
CREATE TABLE IF NOT EXISTS training_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'started', 'completed', 'failed', 'question_answered'
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Question Bank (for dynamic question generation)
CREATE TABLE IF NOT EXISTS training_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, scenario
  options JSONB DEFAULT '[]', -- For multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty INTEGER DEFAULT 1, -- 1-5 scale
  f_tag TEXT, -- Related F-tag if applicable
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;  
ALTER TABLE training_questions ENABLE ROW LEVEL SECURITY;

-- Users can read active training sessions
CREATE POLICY "Users can read active training sessions" ON training_sessions
  FOR SELECT USING (is_active = true);

-- Users can create sessions if they're admin
CREATE POLICY "Admins can manage training sessions" ON training_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Users can read their own analytics
CREATE POLICY "Users can read own training analytics" ON training_analytics
  FOR SELECT USING (user_id = auth.uid());

-- System can insert analytics
CREATE POLICY "System can insert training analytics" ON training_analytics
  FOR INSERT WITH CHECK (true);

-- Users can read questions for active sessions
CREATE POLICY "Users can read training questions" ON training_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_sessions 
      WHERE training_sessions.id::text = training_questions.session_id 
      AND training_sessions.is_active = true
    )
  );

-- Admins can manage questions
CREATE POLICY "Admins can manage training questions" ON training_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Insert some sample training sessions
INSERT INTO training_sessions (id, title, description, estimated_time, passing_score, category, difficulty, questions_count, total_points, tags, content) VALUES
(
  'staffing-compliance'::uuid,
  'Nursing Staff Compliance (F-514)',
  'Interactive training on F-514 nursing staff requirements, RN supervision, and adequate staffing documentation.',
  '15-20 minutes',
  80,
  'Staffing',
  'intermediate',
  8,
  120,
  ARRAY['F-514', 'staffing', 'nursing', 'supervision'],
  '{"learning_objectives": ["Understand F-514 requirements", "Learn RN supervision standards", "Master staffing documentation"], "materials": ["CMS Guidelines", "State Regulations", "Best Practices"]}'::jsonb
),
(
  'infection-control-training'::uuid,
  'Infection Prevention & Control (F-686)',
  'Master F-686 requirements including IPCP programs, surveillance systems, and outbreak response protocols.',
  '20-25 minutes',
  85,
  'Infection Control',
  'advanced',
  12,
  200,
  ARRAY['F-686', 'infection-control', 'IPCP', 'surveillance'],
  '{"learning_objectives": ["Implement IPCP programs", "Establish surveillance systems", "Develop outbreak response"], "materials": ["CDC Guidelines", "Infection Control Manual"]}'::jsonb
);

-- Insert sample questions
INSERT INTO training_questions (session_id, question_text, question_type, options, correct_answer, explanation, difficulty, f_tag, points) VALUES
(
  'staffing-compliance',
  'What is the minimum number of hours a Registered Nurse must be on duty in a SNF?',
  'multiple_choice',
  '["8 hours per day", "24 hours per day", "16 hours per day", "12 hours per day"]'::jsonb,
  '24 hours per day',
  'Per F-514, an RN must be on duty at least 8 consecutive hours per day, 7 days a week, totaling 24 hours minimum weekly.',
  2,
  'F-514',
  15
),
(
  'staffing-compliance', 
  'Can a Licensed Practical Nurse (LPN) serve as the charge nurse during all shifts?',
  'true_false',
  '["True", "False"]'::jsonb,
  'False',
  'An RN must serve as the charge nurse at least 8 hours per day. LPNs cannot fulfill the RN supervision requirement.',
  3,
  'F-514',
  10
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_sessions_category ON training_sessions(category);
CREATE INDEX IF NOT EXISTS idx_training_sessions_active ON training_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_training_analytics_user_session ON training_analytics(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_training_questions_session ON training_questions(session_id);