/**
 * Seed 2025 NFL Super Bowl manually
 * Run with: npx tsx src/lib/api/seed-superbowl.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON = parseInt(process.env.CURRENT_NFL_SEASON || '2025')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Super Bowl - Week 4
// Using manual api_game_id format: MANUAL-SEASON-ROUND-GAME#
const superBowl = {
    // Super Bowl: Seahawks (home) vs Patriots - February 8, 2026 at 6:30 PM EST
    api_game_id: `MANUAL-${CURRENT_SEASON}-SB-1`,
    home_team_abbr: 'SEA',
    away_team_abbr: 'NE',
    scheduled_start_time: '2026-02-08T18:30:00-05:00', // 6:30 PM EST
}

async function seedSuperBowl() {
    console.log('🏈 Starting Super Bowl seed...')
    console.log(`Season: ${CURRENT_SEASON}`)

    try {
        // Fetch teams from database to map abbreviations to IDs
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('id, abbreviation, city, name')

        if (teamsError) {
            throw new Error(`Failed to fetch teams: ${teamsError.message}`)
        }

        const teamMap = new Map(teams.map(t => [t.abbreviation, t]))
        console.log(`Loaded ${teams.length} teams`)

        // Get the Super Bowl round ID
        const { data: playoffRound, error: roundsError } = await supabase
            .from('playoff_rounds')
            .select('*')
            .eq('name', 'Super Bowl')
            .single()

        if (roundsError || !playoffRound) {
            throw new Error(`Failed to fetch Super Bowl round: ${roundsError?.message}`)
        }

        const superBowlRoundId = playoffRound.id
        console.log(`Super Bowl Round ID: ${superBowlRoundId}`)

        const homeTeam = teamMap.get(superBowl.home_team_abbr)
        const awayTeam = teamMap.get(superBowl.away_team_abbr)

        if (!homeTeam) {
            throw new Error(`Home team not found: ${superBowl.home_team_abbr}`)
        }

        if (!awayTeam) {
            throw new Error(`Away team not found: ${superBowl.away_team_abbr}`)
        }

        // Check if game already exists (by api_game_id)
        const { data: existingByApiId } = await supabase
            .from('games')
            .select('id, api_game_id')
            .eq('api_game_id', superBowl.api_game_id)
            .single()

        if (existingByApiId) {
            console.log(`⏭️  Super Bowl ${superBowl.api_game_id} already exists (id: ${existingByApiId.id})`)
            return
        }

        // Also check if a Super Bowl game exists for this season
        const { data: existingByRound } = await supabase
            .from('games')
            .select('id, api_game_id')
            .eq('season', CURRENT_SEASON)
            .eq('playoff_round_id', superBowlRoundId)
            .single()

        if (existingByRound) {
            console.log(`⏭️  A Super Bowl game already exists for season ${CURRENT_SEASON} (api_game_id: ${existingByRound.api_game_id})`)
            return
        }

        const gameData = {
            api_game_id: superBowl.api_game_id,
            season: CURRENT_SEASON,
            playoff_round_id: superBowlRoundId,
            week_number: 4, // Super Bowl = Week 4
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            scheduled_start_time: superBowl.scheduled_start_time,
            status: 'scheduled',
            is_locked: false,
        }

        const { error: insertError } = await supabase
            .from('games')
            .insert(gameData)

        if (insertError) {
            throw new Error(`Error inserting Super Bowl: ${insertError.message}`)
        }

        console.log(`✅ Inserted Super Bowl: ${awayTeam.city} ${awayTeam.name} @ ${homeTeam.city} ${homeTeam.name}`)
        console.log(`   Date: February 8, 2026 at 6:30 PM EST`)

        // List all games in the database for this season
        const { data: allGames } = await supabase
            .from('games')
            .select(`
                id,
                api_game_id,
                week_number,
                scheduled_start_time,
                status,
                home_team:teams!home_team_id(abbreviation, city, name),
                away_team:teams!away_team_id(abbreviation, city, name),
                playoff_round:playoff_rounds(name)
            `)
            .eq('season', CURRENT_SEASON)
            .order('scheduled_start_time', { ascending: true })

        console.log(`\n📅 All ${CURRENT_SEASON} playoff games:`)
        for (const g of allGames || []) {
            const homeTeam = g.home_team as any
            const awayTeam = g.away_team as any
            const round = g.playoff_round as any
            console.log(`  ${round?.name} (Week ${g.week_number}): ${awayTeam?.abbreviation} @ ${homeTeam?.abbreviation} - ${new Date(g.scheduled_start_time).toLocaleString()} [${g.status}]`)
        }

    } catch (error) {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    }
}

// Run the seed
seedSuperBowl()
    .then(() => {
        console.log('\n🎉 Super Bowl seed completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    })
