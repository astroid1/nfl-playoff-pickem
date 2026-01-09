# NFL Playoff Pick'em - Setup Guide

This guide will walk you through setting up your NFL Playoff Pick'em competition website.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [API Keys](#api-keys)
6. [Running Locally](#running-locally)
7. [Deployment](#deployment)

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account ([Sign up for free](https://supabase.com))
- An API-Sports account ([Sign up](https://api-sports.io/))
- A Resend account ([Sign up for free](https://resend.com/))

## Supabase Setup

### 1. Create a New Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Name**: nfl-playoff-pickem (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose the region closest to your users (recommend US East)
   - **Pricing Plan**: Free tier is sufficient for 5-15 users
4. Click "Create new project"
5. Wait for the project to finish setting up (2-3 minutes)

### 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API** in the left sidebar
2. Find and copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: Long JWT token starting with `eyJ...`
   - **service_role key**: Another long JWT token (keep this secret!)

### 3. Configure Authentication

1. Go to **Authentication** → **Providers** in the left sidebar
2. Make sure **Email** provider is enabled (it should be by default)
3. Go to **Authentication** → **Email Templates**
4. Customize the email templates if desired (optional)
5. Go to **Authentication** → **URL Configuration**
6. Add your site URL:
   - For development: `http://localhost:3000`
   - For production: Your Vercel URL (you'll add this later)
7. **IMPORTANT**: Add redirect URLs for authentication:
   - Click **Add URL** under "Redirect URLs"
   - Add: `http://localhost:3000/auth/callback`
   - Add: `http://localhost:3000/auth/update-password`
   - For production, also add your Vercel URLs (e.g., `https://yourapp.vercel.app/auth/callback`)

## Environment Variables

### 1. Update `.env.local`

Open the `.env.local` file in the project root and update it with your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# NFL API (API-Sports) - Get from https://api-sports.io/
NFL_API_KEY=your_api_sports_key_here
NFL_API_BASE_URL=https://v1.american-football.api-sports.io

# Email Service (Resend) - Get from https://resend.com/
RESEND_API_KEY=your_resend_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
CURRENT_NFL_SEASON=2025

# Cron Secret (generate a random string for security)
CRON_SECRET=your_random_secret_string_here
```

### 2. Generate a Cron Secret

Generate a random secret for securing your cron endpoints:

```bash
# On Windows PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or just use any random string
CRON_SECRET=my-super-secret-cron-key-12345
```

## Database Setup

### Method 1: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (bottom right)
7. Wait for the query to complete (should see "Success" message)

### Method 2: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id your-project-ref > src/lib/types/database.types.ts
```

### 3. Verify Database Setup

After running the migration, verify everything is set up correctly:

1. Go to **Table Editor** in the Supabase dashboard
2. You should see these tables:
   - profiles
   - teams
   - playoff_rounds
   - games
   - picks
   - user_stats
   - pick_audit_log
   - api_sync_log

3. Click on `playoff_rounds` table
4. You should see 4 rows:
   - Wild Card (2 points)
   - Divisional (3 points)
   - Conference (4 points)
   - Super Bowl (5 points)

### 4. Enable Realtime (Important!)

1. Go to **Database** → **Replication** in the Supabase dashboard
2. Find the `games` table and toggle **Enable Realtime**
3. Find the `picks` table and toggle **Enable Realtime**
4. These tables will now send real-time updates to your app

## API Keys

### 1. API-Sports (NFL Data)

1. Go to [https://api-sports.io/](https://api-sports.io/)
2. Sign up for a free account
3. Navigate to **My Account** → **API Key**
4. Subscribe to the **NFL** API
5. Choose a plan:
   - **Free**: 100 requests/day (good for testing)
   - **Basic ($10/month)**: 1,000 requests/day (recommended for production)
6. Copy your API key and add it to `.env.local`

### 2. Resend (Email Notifications)

1. Go to [https://resend.com/](https://resend.com/)
2. Sign up for a free account (3,000 emails/month free)
3. Go to **API Keys** in the dashboard
4. Click **Create API Key**
5. Give it a name like "NFL Playoff Pickem"
6. Copy the API key and add it to `.env.local`
7. Go to **Domains** and add your domain (or use their test domain for development)

## Running Locally

### 1. Install Dependencies

If you haven't already:

```bash
cd nfl-playoff-pickem
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the application running!

### 4. Create Your First User

1. Click "Sign Up" (you'll need to create this page - it's in the next phase)
2. Enter your email and password
3. Check your email for verification link
4. Verify your account
5. Log in

## Next Steps

Once you have the basic setup complete, the next phases will include:

1. **Phase 2**: Building authentication pages (login, signup, password reset)
2. **Phase 3**: Creating the core pick'em features (GameCard, picks page, leaderboard)
3. **Phase 4**: Implementing API integration and scheduled jobs
4. **Phase 5**: Setting up email notifications
5. **Phase 6**: Testing
6. **Phase 7**: Deploying to Vercel

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Go to [https://vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Configure environment variables (copy from `.env.local`)
6. Click "Deploy"
7. Once deployed, update your Supabase URL configuration with the production URL

### Setting Up Cron Jobs

Vercel cron jobs will be configured in `vercel.json`. These jobs will:
- Lock games every minute when they start
- Sync scores every 2 minutes during game days
- Calculate stats every 5 minutes
- Send email reminders daily
- Send weekly recaps

More details on this in Phase 4.

## Troubleshooting

### Common Issues

**Issue**: "Invalid API key" error from Supabase
- **Solution**: Double-check that you copied the correct anon key from Supabase dashboard

**Issue**: Database migration fails
- **Solution**: Make sure you're running the SQL in the correct project. Check the project name in the top left of the dashboard.

**Issue**: RLS policies blocking requests
- **Solution**: Make sure you're authenticated when trying to access protected data

**Issue**: Can't connect to API-Sports
- **Solution**: Verify your API key is correct and you have an active subscription to the NFL API

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Check the Supabase logs in **Logs** → **API Logs**
3. Review the implementation plan in `.claude/plans/parsed-wiggling-puppy.md`

## Security Notes

⚠️ **Important Security Reminders**:
- Never commit `.env.local` to version control (it's already in `.gitignore`)
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret - it has admin access
- Keep your `CRON_SECRET` secret - it protects your cron endpoints
- Use environment variables in Vercel for production deployment

---

Happy coding! 🏈
