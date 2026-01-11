/**
 * Cron job to sync live scores from NFL API
 * Runs every 2 minutes via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nflApi, mapGameStatus } from '@/lib/api/nfl-api'

const CRON_SECRET = process.env.CRON_SECRET
const CURRENT_SEASON = parseInt(process.env.CURRENT_NFL_SEASON || '2025')

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = await createClient()

        // Find all games that are scheduled or in progress
        const { data: activeGames, error: fetchError } = await supabase
            .from('games')
            .select('id, api_game_id, home_team_id, away_team_id, status')
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

        console.log(`Syncing ${activeGames.length} active games...`)

        let updated = 0
        let errors = 0
        const updatedGameIds: string[] = []

        // Fetch and update each game
        for (const game of activeGames) {
            try {
                // Fetch latest data from API
                const apiGame = await nflApi.fetchGameById(game.api_game_id)

                if (!apiGame) {
                    console.error(`Game ${game.api_game_id} not found in API`)
                    errors++
                    continue
                }

                const newStatus = mapGameStatus(apiGame.game.status.short)
                // API returns scores.home.total and scores.away.total
                const homeScore = apiGame.scores.home.total ?? null
                const awayScore = apiGame.scores.away.total ?? null

                // Determine winning team if game is final
                let winningTeamId = null
                if (newStatus === 'final' && homeScore !== null && awayScore !== null) {
                    if (homeScore > awayScore) {
                        winningTeamId = game.home_team_id
                    } else if (awayScore > homeScore) {
                        winningTeamId = game.away_team_id
                    }
                    // If tied, winningTeamId stays null (though NFL playoff games can't tie)
                }

                // Update game in database
                const updateData: any = {
                    status: newStatus,
                    home_team_score: homeScore,
                    away_team_score: awayScore,
                    winning_team_id: winningTeamId,
                    last_updated_at: new Date().toISOString(),
                }

                // Set actual_start_time if game just started
                if (game.status === 'scheduled' && newStatus === 'in_progress') {
                    updateData.actual_start_time = new Date().toISOString()
                }

                const { error: updateError } = await supabase
                    .from('games')
                    .update(updateData)
                    .eq('id', game.id)

                if (updateError) {
                    console.error(`Error updating game ${game.api_game_id}:`, updateError.message)
                    errors++
                    continue
                }

                updated++
                updatedGameIds.push(game.api_game_id)

                console.log(`✅ Updated game ${game.api_game_id}: ${newStatus}`)

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))

            } catch (error) {
                console.error(`Error syncing game ${game.api_game_id}:`, error)
                errors++
            }
        }

        // Calculate points for any newly completed games
        const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games')

        if (calcError) {
            console.error('Error calculating points:', calcError)
            // Don't throw - scores are updated, points calc is secondary
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
