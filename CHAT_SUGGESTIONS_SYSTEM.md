# Chat Suggestions System

## Overview

CareIQ uses an intelligent chat suggestion system that displays **different, randomized suggestions** every time users visit the chat page. The system is designed to be cost-effective while providing valuable analytics about what users find most useful.

## How It Works

### 1. **Pre-Generated Suggestions Pool**
- **100+ suggestions** are stored in the database covering 6 categories:
  - Clinical (care plans, medications, assessments)
  - Compliance (CMS regulations, F-Tags, surveys)
  - Operations (staffing, scheduling, budgets)
  - Quality (star ratings, QI scores, QAPI)
  - Staffing (PPD, hiring, training)
  - Documentation (notes, policies, reports)

### 2. **Smart Selection Algorithm**
- **Weighted randomization**: Higher priority and higher-clicked suggestions appear more frequently
- **Category diversity**: Ensures a mix of different types of suggestions
- **True randomness**: Different suggestions each visit
- **Fallback system**: If database fails, uses hardcoded suggestions

### 3. **Analytics Tracking**
Every suggestion tracks:
- **Impressions**: How many times shown
- **Clicks**: How many times clicked
- **Click-through rate (CTR)**: Clicks ÷ Impressions
- **Last clicked**: When it was most recently used
- **Category performance**: Which types of suggestions work best

## Database Schema

```sql
-- Main suggestions table
CREATE TABLE chat_suggestions (
  id uuid PRIMARY KEY,
  icon text NOT NULL,
  title text NOT NULL (2-4 words),
  text text NOT NULL (8-15 words),
  category text CHECK (category IN (...)),
  priority integer CHECK (1-10),
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  last_clicked_at timestamptz,
  created_at timestamptz,
  active boolean DEFAULT true
);

-- Analytics tracking
CREATE TABLE suggestion_analytics (
  id uuid PRIMARY KEY,
  suggestion_id uuid REFERENCES chat_suggestions,
  user_id uuid REFERENCES auth.users,
  action text CHECK (action IN ('impression', 'click')),
  timestamp timestamptz,
  metadata jsonb
);
```

## API Endpoints

### GET `/api/chat-suggestions`
- Returns 6 diverse, randomized suggestions
- Auto-increments impression counts
- Requires authentication

### POST `/api/chat-suggestions`
- Tracks suggestion clicks
- Body: `{ suggestion_id: uuid }`
- Logs to analytics table

## Weekly Refresh Strategy

### Current: Pre-seeded Database
- 40+ high-quality suggestions already in database
- SQL file: `sql/chat_suggestions_schema.sql`
- Run once during setup

### Future: AI-Generated Batches
To generate 100 new suggestions weekly via AI:

```typescript
// Run this as a cron job every Sunday
import { WEEKLY_SUGGESTION_GENERATION_PROMPT } from '@/lib/ai/chatSuggestions';

async function generateWeeklySuggestions() {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cost-effective
      messages: [
        {
          role: 'system',
          content: WEEKLY_SUGGESTION_GENERATION_PROMPT
        }
      ],
      response_format: { type: 'json_object' }
    }),
  });

  const { choices } = await response.json();
  const suggestions = JSON.parse(choices[0].message.content);

  // Insert into database
  await supabase.from('chat_suggestions').insert(
    suggestions.map(s => ({
      ...s,
      clicks: 0,
      impressions: 0,
      active: true
    }))
  );
}
```

### Cost Analysis

**Weekly AI Generation:**
- Model: GPT-4o-mini
- Input: ~500 tokens (prompt)
- Output: ~5,000 tokens (100 suggestions)
- Cost: ~$0.03 per week (~$1.50/year)

**Alternative: Monthly generation**
- Generate 400 suggestions monthly
- Rotate through them randomly
- Cost: ~$0.12 per month (~$1.44/year)

**Current: Pre-seeded + Manual Updates**
- Initial cost: $0 (manually created)
- Update quarterly with AI: ~$0.12/quarter (~$0.48/year)
- **Recommended approach** ✅

## Analytics Dashboard (Future)

Track suggestion performance:

```typescript
// Example analytics query
const topSuggestions = await supabase
  .from('chat_suggestions')
  .select('*, suggestion_analytics(count)')
  .order('clicks', { ascending: false })
  .limit(20);

// CTR analysis
const performanceByCategory = await supabase
  .from('chat_suggestions')
  .select('category, clicks, impressions')
  .then(data => {
    return data.reduce((acc, s) => {
      if (!acc[s.category]) {
        acc[s.category] = { clicks: 0, impressions: 0 };
      }
      acc[s.category].clicks += s.clicks;
      acc[s.category].impressions += s.impressions;
      return acc;
    }, {});
  });
```

## Setup Instructions

### 1. Run Database Migration

```bash
# In Supabase SQL Editor, run:
sql/chat_suggestions_schema.sql
```

This creates:
- `chat_suggestions` table with 40+ pre-seeded suggestions
- `suggestion_analytics` table for tracking
- RLS policies for security
- Helper function for batch impression updates

### 2. Verify API Routes

Files already created:
- `/src/app/api/chat-suggestions/route.ts` - Main API
- `/src/lib/ai/chatSuggestions.ts` - Helper functions
- `/src/components/Chat.tsx` - Updated to use system

### 3. Test the System

```bash
# 1. Visit /chat/new
# 2. Refresh multiple times - suggestions should change
# 3. Click a suggestion
# 4. Check Supabase dashboard:
#    - chat_suggestions table shows incremented clicks/impressions
#    - suggestion_analytics table has new entries
```

## Benefits

✅ **Cost-Effective**: Pre-seeded suggestions cost $0/week
✅ **Dynamic**: Different suggestions every visit
✅ **Smart**: Higher-performing suggestions appear more often
✅ **Analytics**: Track what users find valuable
✅ **Fallback**: Never breaks if database is unavailable
✅ **Scalable**: Easy to add AI generation later

## Future Enhancements

1. **A/B Testing**: Test different suggestion formats
2. **Personalization**: Show suggestions based on user role (DON, RN, CNA)
3. **Time-Based**: Different suggestions for day/night shifts
4. **Trending**: "Most popular this week" section
5. **AI Generation**: Weekly automated suggestion refresh
6. **Admin Dashboard**: View analytics and manage suggestions

## Maintenance

### Add New Suggestions Manually

```sql
INSERT INTO chat_suggestions (icon, title, text, category, priority)
VALUES (
  '🏥',
  'Wound Care',
  'Create a comprehensive wound care plan for a stage 3 pressure ulcer',
  'clinical',
  8
);
```

### Deactivate Low-Performing Suggestions

```sql
-- Find suggestions with low CTR (<2%) and many impressions (>100)
UPDATE chat_suggestions
SET active = false
WHERE impressions > 100 
  AND (clicks::float / impressions) < 0.02;
```

### Analyze Performance

```sql
-- Top 10 suggestions by CTR
SELECT 
  title,
  text,
  category,
  clicks,
  impressions,
  ROUND((clicks::float / NULLIF(impressions, 0) * 100), 2) as ctr_percent
FROM chat_suggestions
WHERE impressions > 10
ORDER BY (clicks::float / NULLIF(impressions, 0)) DESC
LIMIT 10;
```

## Summary

The chat suggestions system provides a **professional, dynamic user experience** that:
- Keeps the interface fresh and engaging
- Helps users discover CareIQ's capabilities
- Provides valuable data on user needs
- Costs virtually nothing to maintain
- Can scale to AI-powered generation when needed

Perfect balance of **intelligence, cost-efficiency, and user value**! 🚀


