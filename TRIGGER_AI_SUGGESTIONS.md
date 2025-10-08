# 🤖 AI Chat Suggestions - Setup & Automation

## ✅ What's Been Set Up

### 1. **Database Schema** (`sql/chat_suggestions_schema.sql`)
- `chat_suggestions` table to store 100 rotating suggestions
- `suggestion_analytics` table to track clicks and impressions
- RLS policies for secure access
- Helper function to increment impressions

### 2. **API Routes**
- **GET `/api/chat-suggestions`** - Returns 20 random suggestions from the database
- **POST `/api/suggestions/generate-weekly`** - Generates 100 new AI-powered suggestions and replaces old ones

### 3. **Automatic Weekly Generation**
- **Vercel Cron Job** configured in `vercel.json`
- Runs **every Sunday at 3:00 AM UTC** (`0 3 * * 0`)
- Automatically generates 100 fresh suggestions and replaces the old ones
- No manual intervention needed once deployed to Vercel

### 4. **Manual Trigger Options**

#### Option A: Admin Dashboard Button
1. Log in to CareIQ with your admin account (`jking4600@gmail.com`)
2. Click **"CareIQ Admin"** button in the sidebar (purple gradient at the top)
3. In the **Quick Links** section, click **"Generate AI Suggestions"**
4. Wait for the ✅ success message (takes ~30 seconds)

#### Option B: Terminal/CLI
```bash
# Get your access token from Supabase session
curl -X POST http://localhost:3000/api/suggestions/generate-weekly \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Option C: Initial Database Seed (First Time Only)
If you need to populate the database initially before the AI generation works:

```bash
# Step 1: Create the schema
cat sql/chat_suggestions_schema.sql | pbcopy
# Paste in Supabase SQL Editor → Execute

# Step 2: Seed with 100 suggestions
cat sql/seed_chat_suggestions.sql | pbcopy
# Paste in Supabase SQL Editor → Execute
```

---

## 🔄 How It Works

### Daily Operations
1. **User visits `/chat/new`**
2. Frontend fetches 20 random suggestions from `/api/chat-suggestions`
3. Cache-busting (`?t={timestamp}` + `cache: 'no-store'`) ensures fresh results every visit
4. Suggestions rotate randomly from the pool of 100

### Weekly Automation
1. **Every Sunday at 3 AM UTC**, Vercel cron triggers `/api/suggestions/generate-weekly`
2. AI (OpenRouter/GPT-4) generates 100 new, diverse suggestions
3. Old suggestions are deleted
4. New suggestions are inserted
5. System keeps running with fresh suggestions

---

## 🛠️ Verifying It Works

### Check Suggestion Count
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM chat_suggestions;
-- Should return 100
```

### Check API Response
```bash
curl http://localhost:3000/api/chat-suggestions | jq '.suggestions | length'
# Should return 20
```

### Check Cron Job Status
- Go to **Vercel Dashboard** → Your Project → **Cron Jobs**
- Look for `/api/suggestions/generate-weekly` with schedule `0 3 * * 0`
- Check execution logs to confirm it runs successfully

---

## 🎯 Next Steps

1. ✅ **Deploy to Vercel** - The cron job only works in production
2. ✅ **Set Environment Variables** in Vercel:
   - `OPENROUTER_API_KEY` - For AI generation
   - `CRON_SECRET` - For secure cron authentication (optional)
3. ✅ **Initial Trigger** - Use the admin dashboard button or run Option C
4. ✅ **Monitor** - Check Vercel logs on Sundays to ensure it runs

---

## 🚀 Features

- **AI-Powered**: Uses GPT-4 to generate contextually relevant suggestions
- **Automatic Rotation**: Fresh suggestions every week, no manual work
- **Analytics**: Tracks clicks and impressions to understand user behavior
- **Cache-Free**: No stale suggestions, always fresh on every visit
- **Admin Control**: Manual trigger button for immediate regeneration

---

## 📝 Files Modified

1. `vercel.json` - Added cron job for Sunday 3 AM UTC
2. `src/app/api/suggestions/generate-weekly/route.ts` - Fixed imports to use `supabaseAdmin`
3. `src/app/admin/page.tsx` - Added "Generate AI Suggestions" button
4. `src/app/chat/new/page.tsx` - Added cache-busting and dynamic suggestion loading
5. `src/components/Chat.tsx` - Added cache-busting to WelcomeScreen suggestions

---

## 🎉 You're All Set!

The system is now fully automated. Every Sunday, your chat will get 100 fresh AI-generated suggestions. Users will see a random selection of 20 each time they visit `/chat/new`, and those 20 rotate every time they refresh or return to the page.

🔥 **No more manual work required!**


