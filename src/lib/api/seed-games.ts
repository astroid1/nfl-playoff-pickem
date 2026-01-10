/**
 * Seed 2025 NFL playoff games into the database
 * Run with: npx tsx src/lib/api/seed-games.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { NFLApiClient } from './nfl-client'
import { mapGameStatus, mapPlayoffRound } from '../types/nfl-api-types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const NFL_API_KEY = process.env.NFL_API_KEY!
const NFL_API_BASE_URL = process.env.NFL_API_BASE_URL || 'https://v1.american-football.api-sports.io'
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || '2025')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

if (!NFL_API_KEY) {
    console.error('Missing required environment variable: NFL_API_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const nflClient = new NFLApiClient(NFL_API_KEY, NFL_API_BASE_URL)

// Map week numbers to playoff rounds
function getWeekNumber(stage: string): number {
    const roundName = mapPlayoffRound(stage)

    switch (roundName) {
        case 'Wild Card':
            return 1
        case 'Divisional':
            return 2
        case 'Conference':
            return 3
        case 'Super Bowl':
            return 4
        default:
            return 1
    }
}

async function seedGames() {
    console.log('🏈 Starting NFL playoff games seed...')
    console.log(`Season: ${CURRENT_SEASON}`)

    try {
        // Fetch playoff rounds from database
        const { data: playoffRounds, error: roundsError } = await supabase
            .from('playoff_rounds')
            .select('*')

        if (roundsError) {
            throw new Error(`Failed to fetch playoff rounds: ${roundsError.message}`)
        }

        const roundMap = new Map(playoffRounds.map(r => [r.name, r.id]))
        console.log(`Loaded ${playoffRounds.length} playoff rounds`)

        // Fetch teams from database to map API IDs to local IDs
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')

        if (teamsError) {
            throw new Error(`Failed to fetch teams: ${teamsError.message}`)
        }

        const teamMap = new Map(teams.map(t => [t.api_team_id, t.id]))
        console.log(`Loaded ${teams.length} teams`)

        // Fetch games from API-Sports
        // For 2025 playoff season (playoffs in January 2025), use season 2024
        // For 2026 playoff season (playoffs in January 2026), use season 2025
        // API-Sports uses the year the regular season started
        const apiSeason = CURRENT_SEASON
        console.log(`Fetching games from API-Sports (season ${apiSeason})...`)

        const games = await nflClient.fetchGames(apiSeason, 1) // NFL league ID = 1

        // Filter for playoff games only
        // Note: API uses "Post Season" as the stage, not individual round names
        // Exclude Pro Bowl games
        const playoffGames = games.filter(g => {
            const stage = g.game.stage.toLowerCase()
            const week = g.game.week.toLowerCase()
            return (stage === 'post season' || stage.includes('post')) && !week.includes('pro bowl')
        })

        console.log(`Found ${playoffGames.length} playoff games`)

        if (playoffGames.length === 0) {
            console.log('⚠️  No playoff games found. The playoff schedule may not be available yet.')
            console.log('You can manually add games later or run this script again when the schedule is released.')
            return
        }

        // Insert/update games in database
        let inserted = 0
        let updated = 0
        let errors = 0
        let skippedTbd = 0

        for (const game of playoffGames) {
            try {
                // Skip games with TBD teams (teams will be determined after earlier rounds)
                if (!game.teams.home.id || !game.teams.away.id) {
                    console.log(`⏭️  Skipping TBD game ${game.game.id}: ${game.game.week} - teams not yet determined`)
                    skippedTbd++
                    continue
                }

                const homeTeamId = teamMap.get(String(game.teams.home.id))
                const awayTeamId = teamMap.get(String(game.teams.away.id))

                if (!homeTeamId || !awayTeamId) {
                    console.error(`⚠️  Skipping game ${game.game.id}: Team not found in database (Home ID: ${game.teams.home.id}, Away ID: ${game.teams.away.id})`)
                    errors++
                    continue
                }

                // Use the week field for playoff round name (e.g., "Wild Card", "Divisional")
                const roundName = mapPlayoffRound(game.game.week)
                const playoffRoundId = roundMap.get(roundName)

                if (!playoffRoundId) {
                    console.error(`⚠️  Skipping game ${game.game.id}: Unknown playoff round "${roundName}" (week: ${game.game.week})`)
                    errors++
                    continue
                }

                const weekNumber = getWeekNumber(game.game.week)
                const scheduledStartTime = new Date(game.game.date.timestamp * 1000).toISOString()
                const status = mapGameStatus(game.game.status.short)

                // Determine winning team if game is final
                // API returns scores.home.total and scores.away.total
                const homeScore = game.scores.home.total ?? null
                const awayScore = game.scores.away.total ?? null
                let winningTeamId = null
                if (status === 'final' && homeScore !== null && awayScore !== null) {
                    if (homeScore > awayScore) {
                        winningTeamId = homeTeamId
                    } else if (awayScore > homeScore) {
                        winningTeamId = awayTeamId
                    }
                }

                const gameData = {
                    api_game_id: String(game.game.id),
                    season: CURRENT_SEASON,
                    playoff_round_id: playoffRoundId,
                    week_number: weekNumber,
                    home_team_id: homeTeamId,
                    away_team_id: awayTeamId,
                    scheduled_start_time: scheduledStartTime,
                    status,
                    home_team_score: homeScore,
                    away_team_score: awayScore,
                    winning_team_id: winningTeamId,
                    is_locked: status !== 'scheduled',
                    locked_at: status !== 'scheduled' ? scheduledStartTime : null,
                }

                // Try to insert, update on conflict
                const { data, error } = await supabase
                    .from('games')
                    .upsert(gameData, {
                        onConflict: 'api_game_id',
                        ignoreDuplicates: false,
                    })
                    .select()

                if (error) {
                    console.error(`Error upserting game ${game.game.id}:`, error.message)
                    errors++
                } else {
                    const homeTeam = teams.find(t => t.id === homeTeamId)
                    const awayTeam = teams.find(t => t.id === awayTeamId)
                    console.log(`✅ Upserted: ${awayTeam?.abbreviation} @ ${homeTeam?.abbreviation} (${roundName})`)
                    if (data && data.length > 0) {
                        updated++
                    } else {
                        inserted++
                    }
                }
            } catch (error) {
                console.error(`Failed to process game ${game.game.id}:`, error)
                errors++
            }
        }

        console.log('\n📊 Seed Summary:')
        console.log(`  Total playoff games found: ${playoffGames.length}`)
        console.log(`  Successfully upserted: ${inserted + updated}`)
        console.log(`  Skipped (TBD teams): ${skippedTbd}`)
        console.log(`  Errors: ${errors}`)

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

// Run the seed
seedGames()
    .then(() => {
        console.log('\n🎉 Games seed completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    })
