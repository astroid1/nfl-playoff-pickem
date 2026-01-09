# Playoff Simulation Guide

This guide explains how to run a complete playoff simulation to test the application.

## What the Simulation Does

The simulation creates a complete playoff bracket with:
- **12 teams** (6 AFC, 6 NFC)
- **13 games total**:
  - 4 Wild Card games (week 1)
  - 4 Divisional games (week 2)
  - 2 Conference Championship games (week 3)
  - 1 Super Bowl (week 4)
- **Picks for all users** (random selections)
- **Simulated game results** to test scoring

## Prerequisites

Make sure you have:
1. A Supabase project set up
2. `.env.local` file with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for simulation)
3. At least one user account created in your app

## How to Run

### Option 1: Complete Simulation (Recommended)

Run everything at once - creates teams, games, picks, and simulates all results:

```bash
npm run simulate-all
```

This will:
1. Create all test teams (Chiefs, Bills, Eagles, Lions, etc.)
2. Create all 13 playoff games
3. Generate random picks for all users
4. Simulate all game results
5. Update scores automatically

### Option 2: Step-by-Step Simulation

For more control, you can run games round by round:

```bash
npm run simulate
```

Then in the console, you can manually run:
- Wild Card games
- Divisional games
- Championship games
- Super Bowl

## What to Test

After running the simulation, check:

### 1. Dashboard (`/dashboard`)
- ✅ Total points are calculated correctly
- ✅ Correct/incorrect pick counts are accurate
- ✅ Win rate percentage is correct
- ✅ Season breakdown by round shows correct counts
- ✅ Rules section displays at bottom

### 2. Leaderboard (`/leaderboard`)
- ✅ **Overall tab**: Users ranked by total points
- ✅ **By Round tab**: Round-specific standings work
- ✅ **Players tab**: All users shown
- ✅ Tiebreaker logic (most correct picks) works

### 3. Make Picks (`/picks`)
- ✅ Can view all games by round
- ✅ Picks are locked for finished games
- ✅ Can change picks for upcoming games
- ✅ Selected picks persist

### 4. Pool Picks (`/pool-picks`)
- ✅ Can see what other users picked
- ✅ Picks hidden until game starts
- ✅ Results shown for finished games

### 5. Scoring System
Verify points are awarded correctly:
- Wild Card: **2 points** per correct pick
- Divisional: **3 points** per correct pick
- Championship: **4 points** per correct pick
- Super Bowl: **5 points** per correct pick

## Simulated Bracket

The simulation follows this bracket:

### Wild Card Round
- HOU beats LAC (home wins)
- BAL beats PIT (home wins)
- MIN beats LAR (away wins)
- TB beats WAS (home wins)

### Divisional Round
- KC beats HOU (home wins)
- BAL beats BUF (away wins)
- DET beats MIN (home wins)
- PHI beats TB (home wins)

### Conference Championships
- KC beats BAL (home wins)
- PHI beats DET (away wins)

### Super Bowl
- PHI beats KC (away wins) 🏆

## Resetting the Simulation

To clear all simulation data and start over:

1. Delete simulation games:
```sql
DELETE FROM games WHERE api_id LIKE 'sim-%';
```

2. Delete associated picks:
```sql
DELETE FROM picks WHERE season = 2025;
```

3. Delete simulation teams:
```sql
DELETE FROM teams WHERE api_id LIKE 'afc%' OR api_id LIKE 'nfc%';
```

4. Reset user stats:
```sql
DELETE FROM user_stats WHERE season = 2025;
```

Or run all at once:
```sql
DELETE FROM picks WHERE season = 2025;
DELETE FROM games WHERE api_id LIKE 'sim-%';
DELETE FROM teams WHERE api_id LIKE 'afc%' OR api_id LIKE 'nfc%';
DELETE FROM user_stats WHERE season = 2025;
```

## Troubleshooting

**"No users found"**
- Create at least one user account by signing up at `/gate`

**"Error creating teams/games"**
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify your Supabase connection

**Picks not showing up**
- Make sure you ran the simulation BEFORE finishing games
- Check that games were created successfully

**Scores not updating**
- Check that the database triggers are working
- Look at the `user_stats` table to see if it's populated

## Tips

1. **Run simulation with real users**: Sign up 3-4 test accounts, then run the simulation to see competition dynamics
2. **Test progressive scoring**: Run Wild Card, check leaderboard, then run Divisional, etc.
3. **Verify tiebreakers**: Look for users with same points but different correct pick counts
4. **Test edge cases**: What happens if a user makes no picks? (They should show 0 points)

## Next Steps

After testing with simulation data:
1. Clear simulation data (see "Resetting" above)
2. Run the real game seeding script for actual 2025 playoff games
3. Have real users make their picks!

Happy testing! 🏈
