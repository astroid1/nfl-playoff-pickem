# Quick Start Guide

## What's Been Completed ✅

### Phase 1: Foundation (DONE)
- ✅ Next.js 14 project initialized with TypeScript
- ✅ All dependencies installed (Supabase, React Query, Tailwind, shadcn/ui, etc.)
- ✅ Project structure created
- ✅ Supabase client configuration set up
- ✅ Complete database schema created ([supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql))
- ✅ Environment variable templates created
- ✅ Vercel configuration with cron jobs set up
- ✅ Documentation created (README, SETUP guide)

## What You Need To Do Now

### 1. Set Up Supabase (15-20 minutes)

**Create Your Project:**
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose a name: `nfl-playoff-pickem`
4. Set a strong database password (save it somewhere safe!)
5. Choose region: **US East (North Virginia)** recommended
6. Click "Create new project" and wait 2-3 minutes

**Run the Database Migrations:**
1. Once your project is ready, click **SQL Editor** in the sidebar
2. Click **New Query**
3. Open the file [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
4. Copy ALL the contents (it's a big file!)
5. Paste into the SQL editor
6. Click **Run** (bottom right corner)
7. Wait for "Success. No rows returned" message
8. Click **New Query** again
9. Open the file [supabase/migrations/002_auth_trigger.sql](supabase/migrations/002_auth_trigger.sql)
10. Copy the contents and paste into the SQL editor
11. Click **Run**
12. This creates an automatic trigger that creates user profiles when accounts are created

**Enable Realtime:**
1. Go to **Database** → **Replication**
2. Find `games` table → Toggle "Enable Realtime" ON
3. Find `picks` table → Toggle "Enable Realtime" ON

**Get Your Credentials:**
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long token starting with `eyJ...`
   - **service_role key**: Another long token (keep secret!)

### 2. Get API Keys (10 minutes)

**API-Sports (NFL Data):**
1. Go to [https://api-sports.io/](https://api-sports.io/)
2. Sign up for an account
3. Subscribe to the **NFL API**
4. Choose a plan:
   - Free: 100 requests/day (testing only)
   - **Basic ($10/mo)**: 1,000 requests/day (recommended)
5. Go to **My Account** → copy your API key

**Resend (Emails):**
1. Go to [https://resend.com/](https://resend.com/)
2. Sign up (free tier: 3,000 emails/month)
3. Go to **API Keys**
4. Click "Create API Key"
5. Name it "NFL Playoff Pickem"
6. Copy the API key

### 3. Configure Environment Variables (2 minutes)

1. Open [.env.local](.env.local) in your code editor
2. Replace the placeholder values:

```bash
# Supabase (from step 1)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

# NFL API (from step 2)
NFL_API_KEY=your_api_sports_key
NFL_API_BASE_URL=https://v1.american-football.api-sports.io

# Resend (from step 2)
RESEND_API_KEY=your_resend_api_key

# App Config (keep as is for now)
NEXT_PUBLIC_APP_URL=http://localhost:3000
CURRENT_NFL_SEASON=2025

# Generate a random string for this
CRON_SECRET=change-this-to-random-string-12345
```

3. Save the file

### 4. Start the Development Server (1 minute)

```bash
cd nfl-playoff-pickem
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## What's Next?

### Phase 2: Authentication (Coming Next)
The next phase will build:
- Login page
- Signup page
- Password reset flow
- Account settings page

These pages will be created in the `src/app/(auth)/` directory.

### Phase 3: Core Features
After authentication, we'll build:
- Weekly picks page with GameCard component
- Leaderboard with real-time updates
- Pool-wide picks view (shows everyone's picks after games start)

### Phase 4: API Integration
Then we'll implement:
- NFL API client to fetch game data
- Scheduled jobs for game locking and score updates
- Real-time score synchronization

### Phase 5-7: Notifications, Testing, Deployment
Finally:
- Email reminder and recap system
- Comprehensive testing
- Production deployment to Vercel

## Project Structure Overview

```
nfl-playoff-pickem/
├── src/
│   ├── app/                  # Next.js pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities, hooks, API clients
│   │   ├── supabase/        # ✅ Already configured!
│   │   └── types/           # ✅ Database types ready!
├── supabase/
│   └── migrations/          # ✅ Database schema ready!
├── .env.local               # ⚠️  UPDATE THIS with your keys
├── SETUP.md                 # Detailed setup instructions
└── README.md                # Project documentation
```

## Important Files

- **Database Schema**: [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) - Complete database with tables, RLS policies, triggers
- **Setup Guide**: [SETUP.md](SETUP.md) - Detailed step-by-step instructions
- **Implementation Plan**: `.claude/plans/parsed-wiggling-puppy.md` - Complete technical specification
- **Environment Config**: [.env.local](.env.local) - Configuration (update this!)

## Verification Checklist

After completing steps 1-4 above, verify everything works:

- [ ] Supabase project created
- [ ] Database migration ran successfully
- [ ] Realtime enabled on `games` and `picks` tables
- [ ] All API keys obtained
- [ ] `.env.local` file updated with actual credentials
- [ ] Development server starts without errors (`npm run dev`)
- [ ] Can visit http://localhost:3000

## Need Help?

1. **Setup Issues**: See [SETUP.md](SETUP.md) for detailed troubleshooting
2. **Technical Details**: Check the implementation plan in `.claude/plans/`
3. **Database Questions**: Review [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)

## Security Reminders

- ⚠️ Never commit `.env.local` to git (it's in `.gitignore`)
- ⚠️ Keep your `SUPABASE_SERVICE_ROLE_KEY` secret
- ⚠️ Keep your `CRON_SECRET` secure
- ⚠️ Don't share your API keys publicly

---

Once you've completed these setup steps, you'll be ready to continue with Phase 2: Authentication! 🚀
