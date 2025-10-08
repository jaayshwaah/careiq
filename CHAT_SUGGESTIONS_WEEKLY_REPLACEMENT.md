# Chat Suggestions Weekly Replacement System

## Overview
The chat suggestion system maintains exactly **100 suggestions** at a time. Every week, all old suggestions are **deleted and replaced** with 100 new ones to keep the database lean and fresh.

## How It Works

### 1. **Weekly Replacement Process**
- Every Sunday at midnight (or on-demand), the system:
  1. **Deletes** all existing suggestions from the database
  2. **Generates** 100 new diverse suggestions
  3. **Inserts** the new suggestions with fresh counters

### 2. **Suggestion Distribution** (100 total)
- **Compliance & Surveys**: 20 suggestions
- **Operations & Daily Rounds**: 20 suggestions  
- **Staffing & HR**: 15 suggestions
- **Care Plans & Clinical**: 15 suggestions
- **Documentation**: 15 suggestions
- **Training & Education**: 8 suggestions
- **Infection Control**: 7 suggestions

### 3. **Random Display**
When users visit `/chat/new`:
- API fetches all 100 active suggestions
- Randomly shuffles them
- Returns 6 random suggestions to display
- Every page refresh shows different suggestions

## Implementation

### Files Modified
1. **`src/lib/ai/chatSuggestions.ts`**
   - Added `generateAndReplaceWeeklySuggestions()` function
   - Added `generateDiverseSuggestions()` with 100 predefined templates
   - Deletes all old suggestions before inserting new ones

2. **`src/app/api/suggestions/generate-weekly/route.ts`** (NEW)
   - API endpoint to trigger weekly generation
   - Supports cron authentication via `x-cron-secret` header
   - Also allows manual trigger by admin users

3. **`src/app/api/chat-suggestions/route.ts`**
   - Already configured to randomly select from all active suggestions
   - No changes needed - works perfectly with replacement system

## Usage

### Manual Trigger (Admin Only)
```bash
# Get your access token from browser
curl -X POST https://your-domain.com/api/suggestions/generate-weekly \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Automated Cron Job (Recommended)

#### Option 1: Vercel Cron
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/suggestions/generate-weekly",
    "schedule": "0 0 * * 0"
  }]
}
```

#### Option 2: GitHub Actions
Create `.github/workflows/weekly-suggestions.yml`:
```yaml
name: Generate Weekly Suggestions
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  workflow_dispatch:  # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X POST https://your-domain.com/api/suggestions/generate-weekly \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

#### Option 3: External Cron Service
Use services like:
- **Cron-job.org**
- **EasyCron**
- **Railway Cron**

Configure to call:
```
POST https://your-domain.com/api/suggestions/generate-weekly
Header: x-cron-secret: your-secret-here
```

## Environment Variables

Add to `.env.local`:
```bash
# Secret for cron job authentication
CRON_SECRET=your-random-secret-here-change-this
```

## Database Impact

### Before (Growing Forever)
```
Week 1: 100 suggestions
Week 2: 200 suggestions
Week 3: 300 suggestions
Week 52: 5,200 suggestions ❌
```

### After (Fixed Size)
```
Week 1: 100 suggestions
Week 2: 100 suggestions (old ones deleted)
Week 3: 100 suggestions (old ones deleted)
Week 52: 100 suggestions ✅
```

## Analytics Preservation

The `suggestion_analytics` table **is NOT deleted** - it preserves historical data:
- Which suggestions were most clicked
- User interaction patterns
- Performance metrics over time

Only the `chat_suggestions` table is cleared weekly.

## Testing

### Test the API Endpoint
1. Run the dev server
2. Get an admin access token from the browser (check Network tab)
3. Call the endpoint:
```bash
curl -X POST http://localhost:3000/api/suggestions/generate-weekly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Response
```json
{
  "ok": true,
  "message": "Successfully generated and replaced 100 weekly suggestions",
  "timestamp": "2025-01-03T00:00:00.000Z"
}
```

## Benefits

✅ **Lean Database**: Always exactly 100 suggestions  
✅ **Fresh Content**: New suggestions every week  
✅ **Fast Queries**: Small table = fast random selection  
✅ **Cost Effective**: No AI generation needed (uses templates)  
✅ **Analytics Preserved**: Historical data remains intact  
✅ **Variety**: Users see different suggestions every visit  

## Customization

To change the suggestions, edit the `templates` array in:
- `src/lib/ai/chatSuggestions.ts` → `generateDiverseSuggestions()`

To change the generation frequency:
- Adjust the cron schedule (currently weekly: `0 0 * * 0`)
- Could be daily, bi-weekly, monthly, etc.

## Monitoring

Check the Vercel logs or your cron service to ensure:
- Weekly generation runs successfully
- Old suggestions are deleted
- New suggestions are inserted
- No errors occur

## Next Steps

1. ✅ Set up cron job (Vercel/GitHub Actions/External)
2. ✅ Add `CRON_SECRET` to environment variables
3. ✅ Test the endpoint manually
4. ✅ Monitor first automated run
5. ✅ Customize suggestion templates as needed


