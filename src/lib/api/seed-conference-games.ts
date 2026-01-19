/**
 * Seed 2025 NFL Conference Championship games manually
 * Run with: npx tsx src/lib/api/seed-conference-games.ts
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

// Conference Championship games - Week 3
// Using manual api_game_id format: MANUAL-SEASON-ROUND-GAME#
const conferenceGames = [
    {
        // AFC Championship: Patriots (home) vs Broncos - January 25, 2026 at 3:00 PM EST
        api_game_id: `MANUAL-${CURRENT_SEASON}-CONF-1`,
        home_team_abbr: 'NE',
        away_team_abbr: 'DEN',
        scheduled_start_time: '2026-01-25T15:00:00-05:00', // 3:00 PM EST
    },
    {
        // NFC Championship: Seahawks (home) vs Rams - January 25, 2026 at 6:30 PM EST
        api_game_id: `MANUAL-${CURRENT_SEASON}-CONF-2`,
        home_team_abbr: 'SEA',
        away_team_abbr: 'LAR',
        scheduled_start_time: '2026-01-25T18:30:00-05:00', // 6:30 PM EST
    },
]

async function seedConferenceGames() {
    console.log('🏈 Starting Conference Championship games seed...')
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

        // Get the Conference round ID
        const { data: playoffRound, error: roundsError } = await supabase
            .from('playoff_rounds')
            .select('*')
            .eq('name', 'Conference')
            .single()

        if (roundsError || !playoffRound) {
            throw new Error(`Failed to fetch Conference round: ${roundsError?.message}`)
        }

        const conferenceRoundId = playoffRound.id
        console.log(`Conference Round ID: ${conferenceRoundId}`)

        let inserted = 0
        let skipped = 0
        let errors = 0

        for (const game of conferenceGames) {
            try {
                const homeTeam = teamMap.get(game.home_team_abbr)
                const awayTeam = teamMap.get(game.away_team_abbr)

                if (!homeTeam) {
                    console.error(`⚠️  Home team not found: ${game.home_team_abbr}`)
                    errors++
                    continue
                }

                if (!awayTeam) {
                    console.error(`⚠️  Away team not found: ${game.away_team_abbr}`)
                    errors++
                    continue
                }

                // Check if game already exists (by api_game_id OR by teams for this round)
                const { data: existingByApiId } = await supabase
                    .from('games')
                    .select('id, api_game_id')
                    .eq('api_game_id', game.api_game_id)
                    .single()

                if (existingByApiId) {
                    console.log(`⏭️  Game ${game.api_game_id} already exists (id: ${existingByApiId.id})`)
                    skipped++
                    continue
                }

                // Also check if same matchup exists for this round (to avoid duplicate matchups)
                const { data: existingByTeams } = await supabase
                    .from('games')
                    .select('id, api_game_id')
                    .eq('season', CURRENT_SEASON)
                    .eq('playoff_round_id', conferenceRoundId)
                    .eq('home_team_id', homeTeam.id)
                    .eq('away_team_id', awayTeam.id)
                    .single()

                if (existingByTeams) {
                    console.log(`⏭️  Game ${awayTeam.abbreviation}@${homeTeam.abbreviation} already exists for Conference Round (api_game_id: ${existingByTeams.api_game_id})`)
                    skipped++
                    continue
                }

                const gameData = {
                    api_game_id: game.api_game_id,
                    season: CURRENT_SEASON,
                    playoff_round_id: conferenceRoundId,
                    week_number: 3, // Conference = Week 3
                    home_team_id: homeTeam.id,
                    away_team_id: awayTeam.id,
                    scheduled_start_time: game.scheduled_start_time,
                    status: 'scheduled',
                    is_locked: false,
                }

                const { error: insertError } = await supabase
                    .from('games')
                    .insert(gameData)

                if (insertError) {
                    console.error(`Error inserting game:`, insertError.message)
                    errors++
                } else {
                    console.log(`✅ Inserted: ${awayTeam.city} ${awayTeam.name} @ ${homeTeam.city} ${homeTeam.name} (${game.scheduled_start_time})`)
                    inserted++
                }
            } catch (error) {
                console.error(`Failed to process game:`, error)
                errors++
            }
        }

        console.log('\n📊 Seed Summary:')
        console.log(`  Inserted: ${inserted}`)
        console.log(`  Skipped (already exist): ${skipped}`)
        console.log(`  Errors: ${errors}`)

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
seedConferenceGames()
    .then(() => {
        console.log('\n🎉 Conference Championship games seed completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    })
