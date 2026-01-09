/**
 * Seed test playoff games for development/testing
 * Run with: npx tsx src/lib/api/seed-test-games.ts
 * 
 * This creates sample playoff games with realistic matchups for testing
 * the picks functionality before the actual playoff schedule is available.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || '2025')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Sample playoff matchups (using common playoff teams)
const testMatchups = [
    // Wild Card Round (Week 1)
    { home: 'BAL', away: 'PIT', round: 'Wild Card', week: 1, date: '2026-01-11T13:00:00-05:00' },
    { home: 'BUF', away: 'MIA', round: 'Wild Card', week: 1, date: '2026-01-11T16:30:00-05:00' },
    { home: 'KC', away: 'LV', round: 'Wild Card', week: 1, date: '2026-01-11T20:15:00-05:00' },
    { home: 'DAL', away: 'GB', round: 'Wild Card', week: 1, date: '2026-01-12T13:00:00-05:00' },
    { home: 'SF', away: 'SEA', round: 'Wild Card', week: 1, date: '2026-01-12T16:30:00-05:00' },
    { home: 'PHI', away: 'TB', round: 'Wild Card', week: 1, date: '2026-01-12T20:15:00-05:00' },

    // Divisional Round (Week 2)
    { home: 'BAL', away: 'BUF', round: 'Divisional', week: 2, date: '2026-01-18T16:30:00-05:00' },
    { home: 'KC', away: 'CIN', round: 'Divisional', week: 2, date: '2026-01-18T20:15:00-05:00' },
    { home: 'SF', away: 'DAL', round: 'Divisional', week: 2, date: '2026-01-19T16:30:00-05:00' },
    { home: 'PHI', away: 'DET', round: 'Divisional', week: 2, date: '2026-01-19T20:15:00-05:00' },

    // Conference Championships (Week 3)
    { home: 'BAL', away: 'KC', round: 'Conference', week: 3, date: '2026-01-26T15:00:00-05:00' },
    { home: 'SF', away: 'PHI', round: 'Conference', week: 3, date: '2026-01-26T18:30:00-05:00' },

    // Super Bowl (Week 4)
    { home: 'KC', away: 'SF', round: 'Super Bowl', week: 4, date: '2026-02-09T18:30:00-05:00' },
]

async function seedTestGames() {
    console.log('🏈 Starting test games seed...')
    console.log(`Season: ${CURRENT_SEASON}\n`)

    try {
        // Get playoff rounds
        const { data: playoffRounds, error: roundsError } = await supabase
            .from('playoff_rounds')
            .select('*')

        if (roundsError) throw roundsError

        const roundMap = new Map(playoffRounds.map(r => [r.name, r.id]))
        console.log(`Loaded ${playoffRounds.length} playoff rounds`)

        // Get teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')

        if (teamsError) throw teamsError

        const teamMap = new Map(teams.map(t => [t.abbreviation, t.id]))
        console.log(`Loaded ${teams.length} teams\n`)

        let inserted = 0
        let skipped = 0

        for (const matchup of testMatchups) {
            const homeTeamId = teamMap.get(matchup.home)
            const awayTeamId = teamMap.get(matchup.away)
            const playoffRoundId = roundMap.get(matchup.round)

            if (!homeTeamId || !awayTeamId) {
                console.log(`⚠️  Skipping ${matchup.away} @ ${matchup.home}: Team not found`)
                skipped++
                continue
            }

            if (!playoffRoundId) {
                console.log(`⚠️  Skipping ${matchup.away} @ ${matchup.home}: Round not found`)
                skipped++
                continue
            }

            // Create a unique API game ID for test games
            const apiGameId = `test-${CURRENT_SEASON}-${matchup.week}-${matchup.home}-${matchup.away}`

            const gameData = {
                api_game_id: apiGameId,
                season: CURRENT_SEASON,
                playoff_round_id: playoffRoundId,
                week_number: matchup.week,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                scheduled_start_time: matchup.date,
                status: 'scheduled',
                is_locked: false,
                home_team_score: null,
                away_team_score: null,
                winning_team_id: null,
            }

            const { error } = await supabase
                .from('games')
                .upsert(gameData, {
                    onConflict: 'api_game_id',
                    ignoreDuplicates: false,
                })

            if (error) {
                console.error(`Error inserting ${matchup.away} @ ${matchup.home}:`, error.message)
                skipped++
            } else {
                console.log(`✅ Added: ${matchup.away} @ ${matchup.home} (${matchup.round})`)
                inserted++
            }
        }

        console.log('\n📊 Seed Summary:')
        console.log(`  Total matchups: ${testMatchups.length}`)
        console.log(`  Successfully inserted: ${inserted}`)
        console.log(`  Skipped: ${skipped}`)

        // Verify games in database
        const { count } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .eq('season', CURRENT_SEASON)

        console.log(`\n✅ Total games in database for season ${CURRENT_SEASON}: ${count}`)

    } catch (error) {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    }
}

seedTestGames()
    .then(() => {
        console.log('\n🎉 Test games seed completed!')
        console.log('\nYou can now:')
        console.log('  1. Visit http://localhost:3000/picks/1 to make picks')
        console.log('  2. Test the game locking functionality')
        console.log('  3. Manually update scores in Supabase to test scoring')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    })
