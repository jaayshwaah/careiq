-- Fix knowledge_base table schema for daily rounds
-- This script ensures all necessary columns exist

-- Add facility_name column if it doesn't exist
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS facility_name TEXT;

-- Add state column if it doesn't exist  
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add embedding column if it doesn't exist (for vector similarity)
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index on facility_id for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_facility_id ON knowledge_base(facility_id);

-- Create index on category for better performance  
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);

-- Create index on facility_name for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_facility_name ON knowledge_base(facility_name);

-- Update the category check constraint to include 'Facility Policy'
ALTER TABLE knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_category_check;
ALTER TABLE knowledge_base 
ADD CONSTRAINT knowledge_base_category_check 
CHECK (category IN ('CMS Regulation', 'Joint Commission', 'CDC Guidelines', 'State Regulation', 'Facility Policy', 'General'));

-- Ensure the table has all required columns
-- (This shows the expected structure - run \d knowledge_base to verify)
SELECT 'Expected columns:' as info;
SELECT 'id, facility_id, facility_name, state, category, title, content, source_url, last_updated, embedding, metadata, created_at' as expected_columns;