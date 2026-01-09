# NFL Playoff Pick'em Competition 🏈

A secure, family-friendly web application for competing to predict NFL playoff game winners. Built with Next.js, Supabase, and TypeScript.

## Features

### Core Functionality
- **User Authentication**: Secure email/password authentication with Supabase
- **Weekly Picks**: Submit predictions for each playoff game
- **Game Locking**: Picks automatically lock when games start - no changes allowed after kickoff
- **Live Scoring**: Real-time score updates during games
- **Leaderboard**: Season-long standings with tiebreaker support
- **Pool-wide Picks**: View everyone's picks after games start
- **Email Notifications**: Reminders and weekly recaps

### Scoring System
- **Wild Card Round**: 2 points per correct pick
- **Divisional Round**: 3 points per correct pick
- **Conference Round**: 4 points per correct pick
- **Super Bowl**: 5 points per correct pick
- **Tiebreaker**: Most total correct picks (count, not points)

### Security Features
- **Multi-layer pick protection**: Database constraints, Row Level Security, triggers, and API validation
- **Audit logging**: Every pick change is tracked for dispute resolution
- **Bulletproof game locking**: Games lock on schedule even if API is down
- **Secure authentication**: JWT-based sessions with automatic refresh

## Tech Stack

- **Frontend**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database & Auth**: Supabase (PostgreSQL + Auth + Realtime)
- **Sports Data**: API-Sports NFL endpoint
- **Email**: Resend with React Email templates
- **Hosting**: Vercel with cron jobs
- **State Management**: React Query + Zustand

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account (free tier works for 5-15 users)
- API-Sports subscription ($10-40/month recommended)
- Resend account (free tier: 3,000 emails/month)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nfl-playoff-pickem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your actual credentials (see [SETUP.md](SETUP.md) for detailed instructions)

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migration from `supabase/migrations/001_initial_schema.sql`
   - Enable Realtime on `games` and `picks` tables

   See [SETUP.md](SETUP.md) for step-by-step instructions.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
nfl-playoff-pickem/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (protected)/       # Protected pages (picks, leaderboard)
│   │   └── api/               # API routes and cron jobs
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── picks/            # Pick submission components
│   │   ├── leaderboard/      # Leaderboard components
│   │   ├── pool-picks/       # Pool-wide picks components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/         # Supabase client configuration
│   │   ├── api/              # NFL API client
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   └── types/            # TypeScript type definitions
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions
├── emails/                   # Email templates
└── public/                   # Static assets
```

## Key Pages

- `/` - Landing page
- `/login` - User login
- `/signup` - User registration
- `/picks/[week]` - Weekly pick submission form
- `/leaderboard` - Season standings
- `/pool-picks/[week]` - View everyone's picks
- `/account` - Account settings

## Database Schema

### Core Tables
- **profiles** - User profiles extending Supabase auth
- **teams** - NFL teams with logos
- **playoff_rounds** - Point values for each round
- **games** - NFL playoff games with lock status
- **picks** - User predictions
- **user_stats** - Leaderboard statistics
- **pick_audit_log** - Audit trail for picks
- **api_sync_log** - API health monitoring

## Scheduled Jobs (Cron)

The application uses Vercel cron jobs for automated tasks:

- **Lock Games** (every 1 minute): Locks games when they start
- **Sync Scores** (every 2 minutes): Updates live scores
- **Calculate Stats** (every 5 minutes): Refreshes leaderboard
- **Send Reminders** (daily at 9 AM ET): Emails users without picks
- **Weekly Recap** (Mondays at 10 AM ET): Sends results summary

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables
4. Deploy!

See [SETUP.md](SETUP.md) for detailed deployment instructions.

### Environment Variables for Production

Make sure to set all environment variables in Vercel:
- Supabase credentials
- API-Sports API key
- Resend API key
- Cron secret
- App URL (your Vercel domain)

## Security

This application implements multiple layers of security:

1. **Row Level Security (RLS)**: Enforced at the database level
2. **Database Triggers**: Prevent locked pick modifications
3. **API Validation**: Backend checks on all mutations
4. **Audit Logging**: Complete trail of all pick changes
5. **Cron Secret**: Protects scheduled job endpoints

## Contributing

This is a family project, but if you'd like to suggest improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for your own family competitions!

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions
2. Review [SETUP.md](SETUP.md) for detailed setup instructions
3. Check the implementation plan in `.claude/plans/`
4. Review browser console and Supabase logs for errors

## Roadmap

### Phase 1: Foundation ✅
- [x] Next.js project setup
- [x] Database schema
- [x] Environment configuration

### Phase 2: Authentication ✅
- [x] Login/signup pages
- [x] Password reset flow
- [x] Account management
- [x] Dashboard with stats
- [x] User profile management

### Phase 3: Core Features
- [ ] Pick submission UI
- [ ] Leaderboard
- [ ] Pool-wide picks view

### Phase 4: API Integration
- [ ] NFL API client
- [ ] Scheduled jobs
- [ ] Score synchronization

### Phase 5: Notifications
- [ ] Email templates
- [ ] Reminder system
- [ ] Weekly recaps

### Phase 6: Testing & Polish
- [ ] Unit tests
- [ ] E2E tests
- [ ] UI/UX improvements

### Phase 7: Deployment
- [ ] Vercel deployment
- [ ] Production monitoring
- [ ] Performance optimization

---

Built with ❤️ for family football fun!


<!-- Trigger deployment -->
