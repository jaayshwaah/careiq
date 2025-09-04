-- Create table for tracking generated files
CREATE TABLE IF NOT EXISTS generated_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('excel', 'pdf', 'word')),
    template_used TEXT NOT NULL,
    generated_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generated_files_chat_id ON generated_files(chat_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_generated_by ON generated_files(generated_by);
CREATE INDEX IF NOT EXISTS idx_generated_files_created_at ON generated_files(created_at);

-- Add RLS policies
ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;

-- Users can only see files they generated or files from their chats
CREATE POLICY "Users can view their generated files" ON generated_files
    FOR SELECT USING (
        generated_by = auth.uid() OR 
        chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
    );

-- Users can insert files for their own chats
CREATE POLICY "Users can create files for their chats" ON generated_files
    FOR INSERT WITH CHECK (
        generated_by = auth.uid() AND
        chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
    );