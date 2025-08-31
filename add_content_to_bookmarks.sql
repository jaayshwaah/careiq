-- Add content column to chat_bookmarks table for knowledge extraction feature
-- This allows us to store the actual message content in bookmarks for better knowledge management

-- Add content column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_bookmarks' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE chat_bookmarks ADD COLUMN content TEXT;
    RAISE NOTICE '✅ Added content column to chat_bookmarks table';
  ELSE
    RAISE NOTICE '✅ Content column already exists in chat_bookmarks table';
  END IF;
END $$;

-- Add category column for better organization
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_bookmarks' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE chat_bookmarks ADD COLUMN category TEXT DEFAULT 'general';
    RAISE NOTICE '✅ Added category column to chat_bookmarks table';
  ELSE
    RAISE NOTICE '✅ Category column already exists in chat_bookmarks table';
  END IF;
END $$;

-- Add knowledge extraction flag
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_bookmarks' 
    AND column_name = 'is_knowledge_extracted'
  ) THEN
    ALTER TABLE chat_bookmarks ADD COLUMN is_knowledge_extracted BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_knowledge_extracted column to chat_bookmarks table';
  ELSE
    RAISE NOTICE '✅ is_knowledge_extracted column already exists in chat_bookmarks table';
  END IF;
END $$;