-- Advanced Chat Features Schema - SAFE VERSION
-- Run this to add bookmarks, sharing, and templates functionality
-- Handles existing objects gracefully

-- Chat bookmarks table
CREATE TABLE IF NOT EXISTS chat_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id, message_id)
);

-- Chat shares table (for team collaboration)
CREATE TABLE IF NOT EXISTS chat_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'comment', 'edit')),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(chat_id, shared_with)
);

-- Chat templates table
CREATE TABLE IF NOT EXISTS chat_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat export requests (for PDF/Excel generation tracking)
CREATE TABLE IF NOT EXISTS chat_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'json')),
  file_url TEXT,
  file_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Add indexes for better performance (safe to re-run)
DROP INDEX IF EXISTS idx_chat_bookmarks_user_id;
DROP INDEX IF EXISTS idx_chat_bookmarks_chat_id;
DROP INDEX IF EXISTS idx_chat_bookmarks_tags;
DROP INDEX IF EXISTS idx_chat_shares_chat_id;
DROP INDEX IF EXISTS idx_chat_shares_shared_with;
DROP INDEX IF EXISTS idx_chat_shares_active;
DROP INDEX IF EXISTS idx_chat_templates_user_id;
DROP INDEX IF EXISTS idx_chat_templates_category;
DROP INDEX IF EXISTS idx_chat_templates_public;
DROP INDEX IF EXISTS idx_chat_templates_tags;
DROP INDEX IF EXISTS idx_chat_exports_user_id;
DROP INDEX IF EXISTS idx_chat_exports_status;

CREATE INDEX idx_chat_bookmarks_user_id ON chat_bookmarks(user_id);
CREATE INDEX idx_chat_bookmarks_chat_id ON chat_bookmarks(chat_id);
CREATE INDEX idx_chat_bookmarks_tags ON chat_bookmarks USING gin(tags);
CREATE INDEX idx_chat_shares_chat_id ON chat_shares(chat_id);
CREATE INDEX idx_chat_shares_shared_with ON chat_shares(shared_with);
CREATE INDEX idx_chat_shares_active ON chat_shares(is_active) WHERE is_active = true;
CREATE INDEX idx_chat_templates_user_id ON chat_templates(user_id);
CREATE INDEX idx_chat_templates_category ON chat_templates(category);
CREATE INDEX idx_chat_templates_public ON chat_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_chat_templates_tags ON chat_templates USING gin(tags);
CREATE INDEX idx_chat_exports_user_id ON chat_exports(user_id);
CREATE INDEX idx_chat_exports_status ON chat_exports(status);

-- Enable RLS on tables
ALTER TABLE chat_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_exports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON chat_bookmarks;
DROP POLICY IF EXISTS "Users can manage shares for their chats" ON chat_shares;
DROP POLICY IF EXISTS "Users can manage their own templates" ON chat_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON chat_templates;
DROP POLICY IF EXISTS "Users can manage their own exports" ON chat_exports;

-- Create RLS policies
CREATE POLICY "Users can manage their own bookmarks" ON chat_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage shares for their chats" ON chat_shares
  FOR ALL USING (
    auth.uid() = shared_by OR 
    (auth.uid() = shared_with AND is_active = true)
  );

CREATE POLICY "Users can manage their own templates" ON chat_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON chat_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own exports" ON chat_exports
  FOR ALL USING (auth.uid() = user_id);

-- Drop existing functions and triggers safely
DROP TRIGGER IF EXISTS update_chat_bookmarks_updated_at ON chat_bookmarks;
DROP TRIGGER IF EXISTS update_chat_templates_updated_at ON chat_templates;
DROP TRIGGER IF EXISTS chat_shares_update_count ON chat_shares;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_chat_share_count();
DROP FUNCTION IF EXISTS increment_template_usage(UUID);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_chat_bookmarks_updated_at 
  BEFORE UPDATE ON chat_bookmarks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_templates_updated_at 
  BEFORE UPDATE ON chat_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add columns to chats table if they don't exist
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Function to update chat share count
CREATE OR REPLACE FUNCTION update_chat_share_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chats SET 
            is_shared = true,
            share_count = (SELECT COUNT(*) FROM chat_shares WHERE chat_id = NEW.chat_id AND is_active = true)
        WHERE id = NEW.chat_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chats SET 
            share_count = (SELECT COUNT(*) FROM chat_shares WHERE chat_id = OLD.chat_id AND is_active = true)
        WHERE id = OLD.chat_id;
        
        UPDATE chats SET 
            is_shared = (SELECT COUNT(*) FROM chat_shares WHERE chat_id = OLD.chat_id AND is_active = true) > 0
        WHERE id = OLD.chat_id;
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE chats SET 
            share_count = (SELECT COUNT(*) FROM chat_shares WHERE chat_id = NEW.chat_id AND is_active = true)
        WHERE id = NEW.chat_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for share count updates
CREATE TRIGGER chat_shares_update_count 
    AFTER INSERT OR UPDATE OR DELETE ON chat_shares 
    FOR EACH ROW EXECUTE FUNCTION update_chat_share_count();

-- Function to increment template usage count safely
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE chat_templates 
    SET usage_count = usage_count + 1 
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Advanced Chat Features migration completed successfully!';
    RAISE NOTICE 'Tables created: chat_bookmarks, chat_shares, chat_templates, chat_exports';
    RAISE NOTICE 'RLS policies enabled and configured';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISE NOTICE 'Ready to use all advanced features!';
END $$;