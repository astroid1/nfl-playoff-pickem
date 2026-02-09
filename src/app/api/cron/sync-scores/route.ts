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

// Map API-Sports team names to database abbreviations
// API-Sports doesn't return team codes, only full names
const TEAM_NAME_MAP: Record<string, string> = {
    'Seattle Seahawks': 'SEA',
    'New England Patriots': 'NE',
    'Philadelphia Eagles': 'PHI',
    'Kansas City Chiefs': 'KC',
    'San Francisco 49ers': 'SF',
    'Buffalo Bills': 'BUF',
    'Baltimore Ravens': 'BAL',
    'Detroit Lions': 'DET',
    'Houston Texans': 'HOU',
    'Green Bay Packers': 'GB',
    'Tampa Bay Buccaneers': 'TB',
    'Los Angeles Rams': 'LAR',
    'Washington Commanders': 'WAS',
    'Minnesota Vikings': 'MIN',
    'Pittsburgh Steelers': 'PIT',
    'Denver Broncos': 'DEN',
    'Los Angeles Chargers': 'LAC',
    'Dallas Cowboys': 'DAL',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Miami Dolphins': 'MIA',
    'Cleveland Browns': 'CLE',
    'Cincinnati Bengals': 'CIN',
    'Indianapolis Colts': 'IND',
    'Tennessee Titans': 'TEN',
    'Jacksonville Jaguars': 'JAC',
    'Atlanta Falcons': 'ATL',
    'Carolina Panthers': 'CAR',
    'New Orleans Saints': 'NO',
    'Arizona Cardinals': 'ARI',
    'Chicago Bears': 'CHI',
    'Las Vegas Raiders': 'LV',
}

function normalizeTeamAbbr(apiAbbr: string | undefined): string {
    if (!apiAbbr) return ''
    return TEAM_ABBR_MAP[apiAbbr] || apiAbbr
}

function teamNameToAbbr(teamName: string | undefined): string {
    if (!teamName) return ''
    return TEAM_NAME_MAP[teamName] || ''
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

        // Get today's date and yesterday (to handle timezone differences - APIs use US Eastern)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const todayStr = today.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD for RapidAPI
        const todayStrDash = today.toISOString().split('T')[0] // YYYY-MM-DD for API-Sports
        const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '')
        const yesterdayStrDash = yesterday.toISOString().split('T')[0]

        console.log(`Fetching games for today (${todayStrDash}) and yesterday (${yesterdayStrDash}) to handle timezone differences`)

        // Fetch data from both APIs for both days
        const rapidApiClient = getRapidApiClient()
        const apiSportsClient = getApiSportsClient()

        let rapidApiGames: NFLGame[] = []
        let apiSportsGames: NFLGame[] = []
        let rapidApiError: Error | null = null
        let apiSportsError: Error | null = null

        // Try RapidAPI (primary) - fetch both days and combine
        try {
            const [todayGames, yesterdayGames] = await Promise.all([
                rapidApiClient.fetchScoreboardByDay(todayStr),
                rapidApiClient.fetchScoreboardByDay(yesterdayStr),
            ])
            rapidApiGames = [...todayGames, ...yesterdayGames]
            console.log(`RapidAPI returned ${todayGames.length} games for today, ${yesterdayGames.length} for yesterday (${rapidApiGames.length} total)`)
        } catch (error) {
            rapidApiError = error instanceof Error ? error : new Error('Unknown RapidAPI error')
            console.error('RapidAPI fetch failed:', rapidApiError.message)
        }

        // Try API-Sports (secondary/fallback) - fetch both days and combine
        try {
            const [todayGames, yesterdayGames] = await Promise.all([
                apiSportsClient.fetchGamesByDate(todayStrDash),
                apiSportsClient.fetchGamesByDate(yesterdayStrDash),
            ])
            apiSportsGames = [...todayGames, ...yesterdayGames]
            console.log(`API-Sports returned ${todayGames.length} games for today, ${yesterdayGames.length} for yesterday (${apiSportsGames.length} total)`)
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

                // If game is on a different day (not today or yesterday), fetch that day specifically
                if (!gameData) {
                    const gameDate = new Date(dbGame.scheduled_start_time)
                    const gameDateStr = gameDate.toISOString().split('T')[0].replace(/-/g, '')
                    const gameDateStrDash = gameDate.toISOString().split('T')[0]

                    // Only fetch if it's not already in our today/yesterday data
                    if (gameDateStr !== todayStr && gameDateStr !== yesterdayStr) {
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
 * Extract quarter number from API-Sports status.short field
 * API-Sports uses "Q1", "Q2", "Q3", "Q4", "OT", "HT" etc.
 */
function extractQuarterFromShort(shortStatus: string | undefined): number | null {
    if (!shortStatus) return null
    const upper = shortStatus.toUpperCase()
    if (upper === 'Q1') return 1
    if (upper === 'Q2') return 2
    if (upper === 'Q3') return 3
    if (upper === 'Q4') return 4
    if (upper === 'OT') return 5
    if (upper === 'HT') return 2 // Halftime is after Q2
    return null
}

/**
 * Find a game in API-Sports response and extract normalized data
 * API-Sports uses team names (not codes), and home/away may be swapped from our DB
 */
function findApiSportsGame(games: NFLGame[], homeAbbr: string, awayAbbr: string): GameData | null {
    // API-Sports returns team names, not codes - map them to abbreviations
    // Also need to handle case where API home/away is swapped from DB
    let apiGame: NFLGame | undefined
    let teamsSwapped = false

    for (const g of games) {
        const rawGame = g as any
        const apiHomeAbbr = teamNameToAbbr(rawGame.teams?.home?.name) || normalizeTeamAbbr(rawGame.teams?.home?.code)
        const apiAwayAbbr = teamNameToAbbr(rawGame.teams?.away?.name) || normalizeTeamAbbr(rawGame.teams?.away?.code)

        // Check if teams match directly
        if (apiHomeAbbr === homeAbbr && apiAwayAbbr === awayAbbr) {
            apiGame = g
            teamsSwapped = false
            break
        }
        // Check if teams are swapped (API has them reversed from our DB)
        if (apiHomeAbbr === awayAbbr && apiAwayAbbr === homeAbbr) {
            apiGame = g
            teamsSwapped = true
            break
        }
    }

    if (!apiGame) return null

    const statusShort = apiGame.game?.status?.short
    const newStatus = mapGameStatus(statusShort)

    // API-Sports doesn't have a quarter property - extract from short field
    const quarter = extractQuarterFromShort(statusShort)

    // If teams are swapped, we need to swap the scores too
    const apiHomeScore = apiGame.scores?.home?.total ?? null
    const apiAwayScore = apiGame.scores?.away?.total ?? null

    return {
        homeAbbr,
        awayAbbr,
        // Map API scores to DB home/away correctly
        homeScore: teamsSwapped ? apiAwayScore : apiHomeScore,
        awayScore: teamsSwapped ? apiHomeScore : apiAwayScore,
        status: newStatus,
        quarter,
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

    // Safeguard: Don't update status to in_progress/final for games that haven't started yet
    // This prevents the API from incorrectly marking future games as started
    const scheduledStart = new Date(dbGame.scheduled_start_time)
    const now = new Date()
    const gameHasStarted = now >= scheduledStart

    let safeStatus = gameData.status
    if (!gameHasStarted && (gameData.status === 'in_progress' || gameData.status === 'final')) {
        console.log(`⚠️ API returned ${gameData.status} for future game ${gameData.awayAbbr}@${gameData.homeAbbr} (starts ${scheduledStart.toISOString()}), keeping as scheduled`)
        safeStatus = 'scheduled'
    }

    // Update game in database
    const updateData: any = {
        status: safeStatus,
        home_team_score: gameHasStarted ? gameData.homeScore : null,
        away_team_score: gameHasStarted ? gameData.awayScore : null,
        winning_team_id: gameHasStarted ? winningTeamId : null,
        quarter: gameHasStarted ? gameData.quarter : null,
        game_clock: gameHasStarted ? gameData.gameClock : null,
        last_updated_at: new Date().toISOString(),
    }

    // Only update api_game_id if not manually set (preserve MANUAL- prefixed IDs)
    if (!dbGame.api_game_id?.startsWith('MANUAL-') && gameData.apiGameId) {
        updateData.api_game_id = gameData.apiGameId
    }

    // Set actual_start_time if game just started (and has actually started based on time)
    if (dbGame.status === 'scheduled' && safeStatus === 'in_progress' && gameHasStarted) {
        updateData.actual_start_time = new Date().toISOString()
    }

    // Lock game if it's in progress or final AND the scheduled start time has passed
    if ((safeStatus === 'in_progress' || safeStatus === 'final') && gameHasStarted) {
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
