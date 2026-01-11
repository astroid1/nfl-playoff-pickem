/**
 * Cron job to sync live scores from NFL API
 * Runs every 2 minutes via Vercel cron
 *
 * Uses the scoreboard-day endpoint for more reliable score fetching
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRapidApiClient, mapGameStatus } from '@/lib/api/nfl-api'

const CRON_SECRET = process.env.CRON_SECRET
const CURRENT_SEASON = parseInt(process.env.CURRENT_NFL_SEASON || '2025')

export async function GET(request: NextRequest) {
    console.log('sync-scores cron started at', new Date().toISOString())

    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        console.log('Unauthorized request')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = await createClient()

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

        // Get today's date in YYYYMMDD format
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

        // Fetch today's scoreboard
        const rapidApiClient = getRapidApiClient()
        const apiGames = await rapidApiClient.fetchScoreboardByDay(dateStr)

        console.log(`API returned ${apiGames.length} games for ${dateStr}`)

        let updated = 0
        let errors = 0
        const updatedGameIds: string[] = []

        // Match API games to our database games by team abbreviations
        for (const dbGame of activeGames) {
            try {
                const homeAbbr = (dbGame.home_team as any)?.abbreviation
                const awayAbbr = (dbGame.away_team as any)?.abbreviation

                if (!homeAbbr || !awayAbbr) {
                    console.error(`Game ${dbGame.id} missing team abbreviations`)
                    errors++
                    continue
                }

                // Find matching API game by team abbreviations
                const apiGame = apiGames.find(g =>
                    g.teams.home.code === homeAbbr && g.teams.away.code === awayAbbr
                )

                if (!apiGame) {
                    // Game might be on a different day, try to fetch that day's scoreboard
                    const gameDate = new Date(dbGame.scheduled_start_time)
                    const gameDateStr = gameDate.toISOString().split('T')[0].replace(/-/g, '')

                    if (gameDateStr !== dateStr) {
                        console.log(`Game ${awayAbbr}@${homeAbbr} is on ${gameDateStr}, fetching that day...`)
                        const dayGames = await rapidApiClient.fetchScoreboardByDay(gameDateStr)
                        const matchingGame = dayGames.find(g =>
                            g.teams.home.code === homeAbbr && g.teams.away.code === awayAbbr
                        )

                        if (matchingGame) {
                            await updateGameFromApi(supabase, dbGame, matchingGame)
                            updated++
                            updatedGameIds.push(String(dbGame.id))
                            continue
                        }
                    }

                    console.log(`No API match for ${awayAbbr}@${homeAbbr}`)
                    continue
                }

                await updateGameFromApi(supabase, dbGame, apiGame)
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

        console.log(`✅ Synced ${updated} games, ${errors} errors`)

        return NextResponse.json({
            success: true,
            message: `Synced ${updated} games`,
            gamesUpdated: updated,
            errors,
            updatedGameIds,
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

async function updateGameFromApi(supabase: any, dbGame: any, apiGame: any) {
    const newStatus = mapGameStatus(apiGame.game.status.short)
    const homeScore = apiGame.scores.home.total ?? null
    const awayScore = apiGame.scores.away.total ?? null

    // Determine winning team if game is final
    let winningTeamId = null
    if (newStatus === 'final' && homeScore !== null && awayScore !== null) {
        if (homeScore > awayScore) {
            winningTeamId = dbGame.home_team_id
        } else if (awayScore > homeScore) {
            winningTeamId = dbGame.away_team_id
        }
    }

    // Get quarter and clock from API
    const quarter = apiGame.game.status.quarter ?? null
    const gameClock = apiGame.game.status.timer ?? null

    // Update game in database
    const updateData: any = {
        status: newStatus,
        home_team_score: homeScore,
        away_team_score: awayScore,
        winning_team_id: winningTeamId,
        quarter: quarter,
        game_clock: gameClock,
        api_game_id: String(apiGame.game.id), // Update to correct API game ID
        last_updated_at: new Date().toISOString(),
    }

    // Set actual_start_time if game just started
    if (dbGame.status === 'scheduled' && newStatus === 'in_progress') {
        updateData.actual_start_time = new Date().toISOString()
    }

    const { error: updateError } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', dbGame.id)

    if (updateError) {
        throw updateError
    }

    const homeAbbr = (dbGame.home_team as any)?.abbreviation
    const awayAbbr = (dbGame.away_team as any)?.abbreviation
    console.log(`✅ Updated ${awayAbbr}@${homeAbbr}: ${newStatus} (${awayScore}-${homeScore}) Q${quarter} ${gameClock || ''}`)
}
