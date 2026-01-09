# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Error: "new row violates row-level security policy for table 'profiles'"

**Problem**: User signup fails when trying to create a profile.

**Solution**: Make sure you've run BOTH database migrations:
1. Run [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
2. Run [supabase/migrations/002_auth_trigger.sql](supabase/migrations/002_auth_trigger.sql)

The second migration creates a database trigger that automatically creates user profiles when accounts are created. Without it, the RLS policies will block manual profile creation.

**How to fix**:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents of `supabase/migrations/002_auth_trigger.sql`
4. Paste and click "Run"
5. Try signing up again

---

#### Error: "Email not confirmed"

**Problem**: Users can't log in immediately after signing up.

**Solution**: This is expected behavior! Supabase requires email verification by default.

**Options**:
1. **Development**: Disable email confirmation temporarily
   - Go to Authentication → Settings
   - Uncheck "Enable email confirmations"
   - Users can now log in immediately (testing only!)

2. **Production**: Keep email confirmation enabled
   - Users must click the verification link in their email
   - Check spam folder if email doesn't arrive
   - Resend verification email if needed

---

#### Error: "Invalid login credentials"

**Possible causes**:
1. Email not verified yet (check inbox)
2. Wrong email or password
3. Account doesn't exist (try signing up first)

**Solution**:
- Double-check email and password
- Look for verification email
- Try password reset if you forgot it

---

#### Error: Password reset link goes to 404 page

**Problem**: Clicking the password reset link in email shows "404 Not Found".

**Solution**: You need to configure redirect URLs in Supabase:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Under "Redirect URLs", click **Add URL**
3. Add these URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/update-password`
4. For production, also add your Vercel URLs
5. Click **Save**
6. Request a new password reset email and try again

The app already has the update password page at `/auth/update-password`, but Supabase needs to know it's an allowed redirect destination.

---

### Database Issues

#### Error: "relation 'profiles' does not exist"

**Problem**: Database migrations haven't been run yet.

**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Run both migration files in order:
   - First: `001_initial_schema.sql`
   - Second: `002_auth_trigger.sql`

---

#### Error: TypeScript build errors about Supabase types

**Problem**: The database types file has placeholder types.

**Solution** (after setting up Supabase):
```bash
# Install Supabase CLI
npm install -g supabase

# Generate types from your actual database
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.types.ts
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID (found in Settings → General).

---

### Environment Variable Issues

#### Error: "Cannot read properties of undefined (reading 'SUPABASE_URL')"

**Problem**: Environment variables not set correctly.

**Solution**:
1. Make sure `.env.local` exists in the project root
2. Check that all required variables are set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Restart the development server after changing env vars:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

---

### Supabase Connection Issues

#### Error: "Failed to fetch"

**Possible causes**:
1. Wrong Supabase URL
2. Network/firewall issues
3. Supabase project paused (free tier inactivity)

**Solution**:
1. Verify your Supabase URL in `.env.local`
2. Check Supabase Dashboard - is the project active?
3. Try accessing Supabase Dashboard directly
4. Check browser console for CORS errors

---

### Development Server Issues

#### Error: Port 3000 already in use

**Solution**:
```bash
# Find process using port 3000 (Windows)
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID_NUMBER> /F

# Or use a different port
PORT=3001 npm run dev
```

---

#### Error: Module not found

**Problem**: Dependencies not installed or import path wrong.

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or if using pnpm/yarn
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### Middleware/Proxy Warning

#### Warning: "The 'middleware' file convention is deprecated"

**Problem**: Next.js 16 shows a deprecation warning.

**Impact**: This is just a warning - the app still works fine!

**Why**: We're using the standard Next.js middleware pattern which is evolving in Next.js 16.

**Solution**: You can safely ignore this for now. The middleware will continue to work. When you're ready to migrate, follow the Next.js upgrade guide.

---

## Getting More Help

### Check the Logs

**Browser Console**:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages (red text)
4. Copy the full error for debugging

**Supabase Logs**:
1. Go to Supabase Dashboard
2. Click "Logs" → "API Logs"
3. Filter by "All" or "Errors"
4. Check recent requests

**Next.js Console**:
- The terminal where `npm run dev` is running
- Shows server-side errors
- Look for compilation errors

### Verify Setup

**Checklist**:
- [ ] Supabase project created
- [ ] Both migrations run successfully
- [ ] Realtime enabled on `games` and `picks` tables
- [ ] All environment variables set in `.env.local`
- [ ] Development server running without errors
- [ ] Can access http://localhost:3000

### Reset and Try Again

If all else fails:

```bash
# 1. Stop the development server
# Ctrl+C in the terminal

# 2. Clear Next.js cache
rm -rf .next

# 3. Reinstall dependencies
rm -rf node_modules
npm install

# 4. Start fresh
npm run dev
```

### Still Having Issues?

1. Check the implementation plan in `.claude/plans/` for technical details
2. Review [SETUP.md](SETUP.md) for step-by-step setup instructions
3. Double-check Supabase configuration matches the docs
4. Try the setup steps again from scratch in a test project

---

## Common Questions

**Q: Do I need to pay for Supabase?**
A: No! The free tier is perfect for 5-15 users. You get 500MB database, 50,000 monthly active users, and 2GB bandwidth.

**Q: Do I need to pay for API-Sports?**
A: For production, yes ($10-40/month recommended). The free tier (100 requests/day) works for initial testing but will be too limited during actual playoffs.

**Q: Can I test without the NFL API?**
A: Not fully. You can test auth and the UI, but the picks functionality requires real game data. You can use the free tier for initial testing.

**Q: Why do I need email verification?**
A: This prevents spam accounts and ensures users have a valid email for password resets. You can disable it in development if needed.

**Q: The build shows TypeScript errors but dev works fine?**
A: This is expected until you generate the proper Supabase types. The app will work fine in development mode - just ignore the build warnings for now.

---

Good luck! 🏈
