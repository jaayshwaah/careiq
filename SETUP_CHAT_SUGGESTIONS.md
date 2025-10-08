# Setup Chat Suggestions

## Quick Start

To enable dynamic chat suggestions that change on every visit:

### 1. Create the Tables

Run this in your Supabase SQL Editor:

```bash
# From your project root
cat sql/chat_suggestions_schema.sql | pbcopy
```

Then paste and run in Supabase SQL Editor.

### 2. Seed Initial Suggestions

Run this to populate 100 diverse suggestions:

```bash
cat sql/seed_chat_suggestions.sql | pbcopy
```

Then paste and run in Supabase SQL Editor.

### 3. Verify It Works

1. Navigate to `/chat/new` in your browser
2. Refresh the page multiple times
3. You should see **different random suggestions** each time!

## How It Works

### Randomization
- The API fetches all suggestions from the past 7 days
- Randomly shuffles them
- Returns 6 different ones each time
- Cache-busting prevents browser caching

### Analytics Tracking
- **Impressions**: Tracked when suggestions are displayed
- **Clicks**: Tracked when users click a suggestion
- View analytics in the `suggestion_analytics` table

### Weekly Refresh

To generate 100 new AI-powered suggestions weekly (optional):

```bash
# Call this API endpoint weekly (set up a cron job)
POST /api/suggestions/generate-weekly
Authorization: Bearer <your-service-role-key>
```

This will:
- Generate 100 new contextual suggestions using AI
- Replace old suggestions (keeps database clean)
- Maintain diversity across categories

## Categories

Suggestions are organized into:
- `clinical` - Patient care, assessments, medications
- `compliance` - Surveys, F-Tags, regulations
- `staffing` - Schedules, PPD, training
- `documentation` - Charting, records, reports
- `quality` - QI, metrics, outcomes
- `operations` - Facility management, budgets

## Current Status

✅ **Chat Component**: Updated with cache-busting
✅ **API Route**: Ready to serve random suggestions
✅ **SQL Schema**: Complete with RLS policies
✅ **Seed Data**: 100 diverse suggestions ready
✅ **Analytics**: Click and impression tracking

## Testing Without Database

If the database tables aren't set up yet, the system automatically falls back to hardcoded suggestions:

```javascript
// Fallback suggestions in Chat.tsx
{ id: 'f1', icon: "📋", title: "Survey Prep", text: "Help me prepare for an upcoming CMS survey" },
{ id: 'f2', icon: "👥", title: "Staffing", text: "Calculate PPD hours for our facility" },
{ id: 'f3', icon: "🏥", title: "Compliance", text: "Explain F-Tag 689 requirements" },
{ id: 'f4', icon: "📊", title: "Quality", text: "Improve our quality indicator scores" }
```

## Troubleshooting

### Suggestions Not Changing?
1. Check browser dev tools Network tab for the API call
2. Verify the response contains different `id` values each time
3. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
4. Check if `chat_suggestions` table has data

### Using Fallback Suggestions?
- This means the database query failed
- Check Supabase logs for errors
- Verify RLS policies allow read access
- Ensure tables exist

### No Suggestions Showing?
- Open browser console for errors
- Check API response at `/api/chat-suggestions`
- Verify authentication is working

## Next Steps

1. **Run the SQL scripts** to create tables and seed data
2. **Test the randomization** by refreshing `/chat/new`
3. **Set up weekly generation** (optional) for fresh AI suggestions
4. **Monitor analytics** to see which suggestions users prefer

---

**Status**: Ready for production! 🚀


