-- Feature requests table for user feedback and voting
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

-- Feature request votes table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON public.feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes ON public.feature_requests(votes DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON public.feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_feature_id ON public.feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user_id ON public.feature_request_votes(user_id);

-- RLS policies
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

-- Function to update vote count
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

-- Trigger to automatically update vote counts
CREATE TRIGGER update_vote_count_trigger
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_feature_request_vote_count();
