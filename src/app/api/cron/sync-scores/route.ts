/**
 * Cron job to sync live scores from NFL API
 * Runs every 2 minutes via Vercel cron
 *
 * Uses dual API providers (RapidAPI primary, API-Sports fallback)
 * for maximum reliability and coverage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRapidApiClient, getApiSportsClient, mapGameStatus } from '@/lib/api/nfl-api'
import type { NFLGame } from '@/lib/types/nfl-api-types'

const CRON_SECRET = process.env.CRON_SECRET
const CURRENT_SEASON = parseInt(process.env.CURRENT_NFL_SEASON || '2025')

interface GameData {
    homeAbbr: string
    awayAbbr: string
    homeScore: number | null
    awayScore: number | null
    status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled'
    quarter: number | null
    gameClock: string | null
    apiGameId: string
    source: 'rapidapi' | 'api-sports'
}

// Map API abbreviations to database abbreviations
// APIs sometimes use different codes than our database
const TEAM_ABBR_MAP: Record<string, string> = {
    // Los Angeles teams
    'LA': 'LAR',      // Rams
    'LAR': 'LAR',
    'LAC': 'LAC',     // Chargers
    // New York teams
    'NYG': 'NYG',
    'NYJ': 'NYJ',
    // Jacksonville sometimes listed as JAX
    'JAX': 'JAC',
    'JAC': 'JAC',
    // Washington sometimes listed differently
    'WAS': 'WAS',
    'WSH': 'WAS',
}

function normalizeTeamAbbr(apiAbbr: string | undefined): string {
    if (!apiAbbr) return ''
    return TEAM_ABBR_MAP[apiAbbr] || apiAbbr
}

export async function GET(request: NextRequest) {
    console.log('sync-scores cron started at', new Date().toISOString())

    // Verify cron secret - Vercel cron uses Authorization header
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'

    console.log('Auth header present:', !!authHeader)
    console.log('Is Vercel cron:', isVercelCron)
    console.log('CRON_SECRET set:', !!CRON_SECRET)

    // Allow if: valid auth header OR Vercel cron header is present
    if (!isVercelCron && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.log('Unauthorized request - rejecting')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authorization passed, starting sync...')

    try {
        const supabase = createServiceClient()

        // Find all games that are scheduled or in progress for today and nearby dates
        const { data: activeGames, error: fetchError } = await supabase
            .from('games')
            .select(`
                id,
                api_game_id,
                home_team_id,
                away_team_id,
                status,
                scheduled_start_time,
                home_team:teams!home_team_id(abbreviation),
                away_team:teams!away_team_id(abbreviation)
            `)
            .in('status', ['scheduled', 'in_progress'])

        if (fetchError) {
            throw fetchError
        }

        if (!activeGames || activeGames.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active games to sync',
                gamesUpdated: 0,
            })
        }

        console.log(`Found ${activeGames.length} active games to sync`)

        // Get today's date
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD for RapidAPI
        const dateStrDash = today.toISOString().split('T')[0] // YYYY-MM-DD for API-Sports

        // Fetch data from both APIs
        const rapidApiClient = getRapidApiClient()
        const apiSportsClient = getApiSportsClient()

        let rapidApiGames: NFLGame[] = []
        let apiSportsGames: NFLGame[] = []
        let rapidApiError: Error | null = null
        let apiSportsError: Error | null = null

        // Try RapidAPI (primary)
        try {
            rapidApiGames = await rapidApiClient.fetchScoreboardByDay(dateStr)
            console.log(`RapidAPI returned ${rapidApiGames.length} games`)
            // Log team codes for debugging
            rapidApiGames.forEach((g: any) => {
                console.log(`RapidAPI game: ${g.teams?.away?.code}@${g.teams?.home?.code}`)
            })
        } catch (error) {
            rapidApiError = error instanceof Error ? error : new Error('Unknown RapidAPI error')
            console.error('RapidAPI fetch failed:', rapidApiError.message)
        }

        // Try API-Sports (secondary/fallback)
        try {
            apiSportsGames = await apiSportsClient.fetchGamesByDate(dateStrDash)
            console.log(`API-Sports returned ${apiSportsGames.length} games`)
            // Log team codes for debugging
            apiSportsGames.forEach((g: any) => {
                console.log(`API-Sports game: ${g.teams?.away?.code}@${g.teams?.home?.code}`)
            })
        } catch (error) {
            apiSportsError = error instanceof Error ? error : new Error('Unknown API-Sports error')
            console.error('API-Sports fetch failed:', apiSportsError.message)
        }

        // If both APIs failed, throw error
        if (rapidApiError && apiSportsError) {
            throw new Error(`Both APIs failed. RapidAPI: ${rapidApiError.message}, API-Sports: ${apiSportsError.message}`)
        }

        let updated = 0
        let errors = 0
        const updatedGameIds: string[] = []
        const apiUsage = { rapidapi: 0, apiSports: 0 }

        // Process each active game in the database
        for (const dbGame of activeGames) {
            try {
                const homeAbbr = (dbGame.home_team as any)?.abbreviation
                const awayAbbr = (dbGame.away_team as any)?.abbreviation

                if (!homeAbbr || !awayAbbr) {
                    console.error(`Game ${dbGame.id} missing team abbreviations`)
                    errors++
                    continue
                }

                // Try to find game data from either API
                let gameData: GameData | null = null

                // First try RapidAPI
                if (rapidApiGames.length > 0) {
                    gameData = findRapidApiGame(rapidApiGames, homeAbbr, awayAbbr)
                    if (gameData) {
                        apiUsage.rapidapi++
                    }
                }

                // If not found in RapidAPI or RapidAPI failed, try API-Sports
                if (!gameData && apiSportsGames.length > 0) {
                    gameData = findApiSportsGame(apiSportsGames, homeAbbr, awayAbbr)
                    if (gameData) {
                        apiUsage.apiSports++
                    }
                }

                // If game is on a different day, fetch that day specifically
                if (!gameData) {
                    const gameDate = new Date(dbGame.scheduled_start_time)
                    const gameDateStr = gameDate.toISOString().split('T')[0].replace(/-/g, '')
                    const gameDateStrDash = gameDate.toISOString().split('T')[0]

                    if (gameDateStr !== dateStr) {
                        console.log(`Game ${awayAbbr}@${homeAbbr} is on ${gameDateStrDash}, fetching that day...`)

                        // Try RapidAPI for that day
                        if (!rapidApiError) {
                            try {
                                const dayGames = await rapidApiClient.fetchScoreboardByDay(gameDateStr)
                                gameData = findRapidApiGame(dayGames, homeAbbr, awayAbbr)
                                if (gameData) apiUsage.rapidapi++
                            } catch (e) {
                                console.log('RapidAPI day fetch failed:', e)
                            }
                        }

                        // Fallback to API-Sports for that day
                        if (!gameData && !apiSportsError) {
                            try {
                                const dayGames = await apiSportsClient.fetchGamesByDate(gameDateStrDash)
                                gameData = findApiSportsGame(dayGames, homeAbbr, awayAbbr)
                                if (gameData) apiUsage.apiSports++
                            } catch (e) {
                                console.log('API-Sports day fetch failed:', e)
                            }
                        }
                    }
                }

                // If still not found, try the previous day (API might use US timezone dates)
                if (!gameData) {
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '')
                    const yesterdayStrDash = yesterday.toISOString().split('T')[0]

                    console.log(`Game ${awayAbbr}@${homeAbbr} not found, trying previous day ${yesterdayStrDash}...`)

                    // Try RapidAPI for yesterday
                    if (!rapidApiError) {
                        try {
                            const dayGames = await rapidApiClient.fetchScoreboardByDay(yesterdayStr)
                            gameData = findRapidApiGame(dayGames, homeAbbr, awayAbbr)
                            if (gameData) {
                                apiUsage.rapidapi++
                                console.log(`Found game on ${yesterdayStrDash} via RapidAPI`)
                            }
                        } catch (e) {
                            console.log('RapidAPI yesterday fetch failed:', e)
                        }
                    }

                    // Fallback to API-Sports for yesterday
                    if (!gameData && !apiSportsError) {
                        try {
                            const dayGames = await apiSportsClient.fetchGamesByDate(yesterdayStrDash)
                            gameData = findApiSportsGame(dayGames, homeAbbr, awayAbbr)
                            if (gameData) {
                                apiUsage.apiSports++
                                console.log(`Found game on ${yesterdayStrDash} via API-Sports`)
                            }
                        } catch (e) {
                            console.log('API-Sports yesterday fetch failed:', e)
                        }
                    }
                }

                if (!gameData) {
                    console.log(`No API match for ${awayAbbr}@${homeAbbr}`)
                    continue
                }

                // Update game in database
                await updateGameFromData(supabase, dbGame, gameData)
                updated++
                updatedGameIds.push(String(dbGame.id))

            } catch (error) {
                console.error(`Error syncing game ${dbGame.id}:`, error)
                errors++
            }
        }

        // Calculate points for any newly completed games
        const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games')

        if (calcError) {
            console.error('Error calculating points:', calcError)
        }

        // Refresh user stats for leaderboard
        const { error: statsError } = await supabase.rpc('refresh_user_stats', { p_season: CURRENT_SEASON })

        if (statsError) {
            console.error('Error refreshing user stats:', statsError)
        }

        console.log(`✅ Synced ${updated} games (RapidAPI: ${apiUsage.rapidapi}, API-Sports: ${apiUsage.apiSports}), ${errors} errors`)

        return NextResponse.json({
            success: true,
            message: `Synced ${updated} games`,
            gamesUpdated: updated,
            errors,
            updatedGameIds,
            apiUsage,
            apiStatus: {
                rapidapi: rapidApiError ? 'failed' : 'ok',
                apiSports: apiSportsError ? 'failed' : 'ok',
            },
        })

    } catch (error) {
        console.error('Error in sync-scores cron:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Find a game in RapidAPI response and extract normalized data
 */
function findRapidApiGame(games: NFLGame[], homeAbbr: string, awayAbbr: string): GameData | null {
    // RapidAPI games have teams.home.code and teams.away.code
    // Normalize API abbreviations to match database
    const apiGame = games.find((g: any) => {
        const apiHomeAbbr = normalizeTeamAbbr(g.teams?.home?.code)
        const apiAwayAbbr = normalizeTeamAbbr(g.teams?.away?.code)
        return apiHomeAbbr === homeAbbr && apiAwayAbbr === awayAbbr
    })

    if (!apiGame) return null

    // Access the raw data (may have different structure)
    const rawGame = apiGame as any

    // RapidAPI uses: game.status.short for status codes, scores.home.total/scores.away.total
    const statusShort = rawGame.game?.status?.short
    const newStatus = mapGameStatus(statusShort)

    return {
        homeAbbr,
        awayAbbr,
        homeScore: rawGame.scores?.home?.total ?? null,
        awayScore: rawGame.scores?.away?.total ?? null,
        status: newStatus,
        quarter: rawGame.game?.status?.quarter ?? null,
        gameClock: rawGame.game?.status?.timer ?? null,
        apiGameId: String(rawGame.game?.id || ''),
        source: 'rapidapi',
    }
}

/**
 * Find a game in API-Sports response and extract normalized data
 */
function findApiSportsGame(games: NFLGame[], homeAbbr: string, awayAbbr: string): GameData | null {
    // API-Sports games have teams.home.code and teams.away.code (same interface)
    // Normalize API abbreviations to match database
    const apiGame = games.find(g => {
        const apiHomeAbbr = normalizeTeamAbbr(g.teams?.home?.code)
        const apiAwayAbbr = normalizeTeamAbbr(g.teams?.away?.code)
        return apiHomeAbbr === homeAbbr && apiAwayAbbr === awayAbbr
    })

    if (!apiGame) return null

    const statusShort = apiGame.game?.status?.short
    const newStatus = mapGameStatus(statusShort)

    return {
        homeAbbr,
        awayAbbr,
        homeScore: apiGame.scores?.home?.total ?? null,
        awayScore: apiGame.scores?.away?.total ?? null,
        status: newStatus,
        quarter: apiGame.game?.status?.quarter ?? null,
        gameClock: apiGame.game?.status?.timer ?? null,
        apiGameId: String(apiGame.game?.id || ''),
        source: 'api-sports',
    }
}

/**
 * Update game in database from normalized game data
 */
async function updateGameFromData(supabase: any, dbGame: any, gameData: GameData) {
    // Determine winning team if game is final
    let winningTeamId = null
    if (gameData.status === 'final' && gameData.homeScore !== null && gameData.awayScore !== null) {
        if (gameData.homeScore > gameData.awayScore) {
            winningTeamId = dbGame.home_team_id
        } else if (gameData.awayScore > gameData.homeScore) {
            winningTeamId = dbGame.away_team_id
        }
    }

    // Update game in database
    const updateData: any = {
        status: gameData.status,
        home_team_score: gameData.homeScore,
        away_team_score: gameData.awayScore,
        winning_team_id: winningTeamId,
        quarter: gameData.quarter,
        game_clock: gameData.gameClock,
        api_game_id: gameData.apiGameId,
        last_updated_at: new Date().toISOString(),
    }

    // Set actual_start_time if game just started
    if (dbGame.status === 'scheduled' && gameData.status === 'in_progress') {
        updateData.actual_start_time = new Date().toISOString()
    }

    // Lock game if it's in progress or final
    if (gameData.status === 'in_progress' || gameData.status === 'final') {
        updateData.is_locked = true
        if (!dbGame.locked_at) {
            updateData.locked_at = new Date().toISOString()
        }
    }

    const { error: updateError } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', dbGame.id)

    if (updateError) {
        throw updateError
    }

    console.log(`✅ Updated ${gameData.awayAbbr}@${gameData.homeAbbr}: ${gameData.status} (${gameData.awayScore}-${gameData.homeScore}) Q${gameData.quarter} ${gameData.gameClock || ''} [${gameData.source}]`)
}
