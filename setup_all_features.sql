-- =====================================================
-- CareIQ Feature Setup SQL
-- Run this entire file in your Supabase SQL Editor
-- =====================================================

-- 1. Feature requests table for user feedback and voting
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('ui', 'functionality', 'integration', 'performance', 'security', 'general')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'in_progress', 'completed', 'rejected', 'duplicate')),
  votes integer NOT NULL DEFAULT 0,
  is_duplicate_of uuid REFERENCES public.feature_requests(id),
  admin_notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT feature_requests_pkey PRIMARY KEY (id),
  CONSTRAINT feature_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 2. Feature request votes table
CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feature_request_votes_pkey PRIMARY KEY (id),
  CONSTRAINT feature_request_votes_feature_request_id_fkey FOREIGN KEY (feature_request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  CONSTRAINT feature_request_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT unique_user_vote UNIQUE (feature_request_id, user_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON public.feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes ON public.feature_requests(votes DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON public.feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_feature_id ON public.feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user_id ON public.feature_request_votes(user_id);

-- 4. RLS policies
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all feature requests
CREATE POLICY "feature_requests_select_all" ON public.feature_requests
  FOR SELECT USING (true);

-- Users can insert their own feature requests
CREATE POLICY "feature_requests_insert_own" ON public.feature_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own feature requests (if not completed)
CREATE POLICY "feature_requests_update_own" ON public.feature_requests
  FOR UPDATE USING (auth.uid() = user_id AND status != 'completed');

-- Users can view all votes
CREATE POLICY "feature_request_votes_select_all" ON public.feature_request_votes
  FOR SELECT USING (true);

-- Users can insert their own votes
CREATE POLICY "feature_request_votes_insert_own" ON public.feature_request_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "feature_request_votes_delete_own" ON public.feature_request_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Function to update vote count
CREATE OR REPLACE FUNCTION update_feature_request_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests 
    SET votes = votes + 1 
    WHERE id = NEW.feature_request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests 
    SET votes = votes - 1 
    WHERE id = OLD.feature_request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to automatically update vote counts
CREATE TRIGGER update_vote_count_trigger
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_feature_request_vote_count();

-- 7. Create chat branches table for branching functionality
CREATE TABLE IF NOT EXISTS public.chat_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  message_id uuid NOT NULL,
  parent_message_id uuid,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  CONSTRAINT chat_branches_pkey PRIMARY KEY (id),
  CONSTRAINT chat_branches_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
  CONSTRAINT chat_branches_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 8. Chat branches indexes
CREATE INDEX IF NOT EXISTS idx_chat_branches_chat_id ON public.chat_branches(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_branches_message_id ON public.chat_branches(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_branches_is_active ON public.chat_branches(is_active);

-- 9. Chat branches RLS
ALTER TABLE public.chat_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_branches_select_own" ON public.chat_branches
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "chat_branches_insert_own" ON public.chat_branches
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "chat_branches_update_own" ON public.chat_branches
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "chat_branches_delete_own" ON public.chat_branches
  FOR DELETE USING (auth.uid() = created_by);

-- 10. Ensure profiles table has proper RLS (fix for infinite recursion)
-- Drop existing policies that might cause recursion
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN 
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Create simple, safe policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 11. Add some sample feature requests for testing
INSERT INTO public.feature_requests (user_id, title, description, category, priority, status) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Dark Mode Toggle', 'Add a dark mode toggle to the interface for better user experience during night shifts.', 'ui', 'medium', 'pending'),
  ('00000000-0000-0000-0000-000000000000', 'Mobile App', 'Create a mobile app version for easier access on tablets and phones.', 'functionality', 'high', 'under_review'),
  ('00000000-0000-0000-0000-000000000000', 'Voice Commands', 'Add voice command support for hands-free operation during patient care.', 'functionality', 'low', 'pending'),
  ('00000000-0000-0000-0000-000000000000', 'EPIC Integration', 'Integrate with EPIC EHR system for seamless data synchronization.', 'integration', 'high', 'in_progress'),
  ('00000000-0000-0000-0000-000000000000', 'Offline Mode', 'Add offline functionality for areas with poor internet connectivity.', 'performance', 'medium', 'pending')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Setup Complete!
-- All features are now ready to use:
-- - Feature requests with voting
-- - Chat branching functionality  
-- - Fixed RLS policies
-- - Sample data for testing
-- =====================================================
