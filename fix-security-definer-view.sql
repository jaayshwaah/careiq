-- Fix Security Definer View Issue
-- Removes SECURITY DEFINER from chat_meta view

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.chat_meta CASCADE;

CREATE VIEW public.chat_meta AS
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.created_at,
  c.updated_at,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at,
  CASE 
    WHEN EXISTS(SELECT 1 FROM messages m2 WHERE m2.chat_id = c.id AND m2.attachments IS NOT NULL AND jsonb_array_length(m2.attachments) > 0) 
    THEN true 
    ELSE false 
  END as has_attachments
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at;

-- Success notification
DO $$
BEGIN
    RAISE NOTICE '✓ chat_meta view recreated without SECURITY DEFINER';
    RAISE NOTICE 'Security definer view warning should now be resolved.';
END $$;