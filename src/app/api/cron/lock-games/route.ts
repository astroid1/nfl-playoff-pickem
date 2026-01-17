/**
 * Cron job to lock games that have started
 * Runs every minute via Vercel cron
 *
 * Also auto-picks for users who missed the deadline before locking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
    // Verify cron secret - Vercel cron uses Authorization header or x-vercel-cron
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'

    if (!isVercelCron && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = createServiceClient()
        const now = new Date().toISOString()

        // Find all unlocked games that should be locked (with full game data for auto-picks)
        const { data: gamesToLock, error: fetchError } = await supabase
            .from('games')
            .select('id, api_game_id, scheduled_start_time, home_team_id, away_team_id, season, week_number')
            .eq('is_locked', false)
            .lte('scheduled_start_time', now)

        if (fetchError) {
            throw fetchError
        }

        if (!gamesToLock || gamesToLock.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No games to lock',
                gamesLocked: 0,
                autoPicksCreated: 0,
            })
        }

        // === AUTO-PICK LOGIC (runs BEFORE locking) ===
        let totalAutoPicksCreated = 0

        // Get all user IDs
        const { data: allUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id')

        if (usersError) {
            console.error('Error fetching users for auto-pick:', usersError)
        }

        if (allUsers && allUsers.length > 0) {
            const allUserIds = allUsers.map(u => u.id)

            for (const game of gamesToLock) {
                // Get existing picks for this game
                const { data: existingPicks, error: picksError } = await supabase
                    .from('picks')
                    .select('user_id')
                    .eq('game_id', game.id)

                if (picksError) {
                    console.error(`Error fetching picks for game ${game.id}:`, picksError)
                    continue
                }

                // Find users who haven't picked
                const usersWithPicks = new Set(existingPicks?.map(p => p.user_id) || [])
                const usersWithoutPicks = allUserIds.filter(userId => !usersWithPicks.has(userId))

                if (usersWithoutPicks.length > 0) {
                    // Create auto-picks for users who missed the deadline
                    const autoPicksToInsert = usersWithoutPicks.map(userId => {
                        // Randomly select home or away team (50/50)
                        const selectedTeamId = Math.random() < 0.5 ? game.home_team_id : game.away_team_id
                        return {
                            user_id: userId,
                            game_id: game.id,
                            selected_team_id: selectedTeamId,
                            season: game.season,
                            week_number: game.week_number,
                            is_auto_pick: true,
                        }
                    })

                    const { error: insertError } = await supabase
                        .from('picks')
                        .insert(autoPicksToInsert)

                    if (insertError) {
                        console.error(`Error creating auto-picks for game ${game.id}:`, insertError)
                    } else {
                        totalAutoPicksCreated += autoPicksToInsert.length
                        console.log(`🎲 Created ${autoPicksToInsert.length} auto-picks for game ${game.api_game_id}`)
                    }
                }
            }
        }

        // === NOW LOCK THE GAMES ===
        const { error: updateError } = await supabase
            .from('games')
            .update({
                is_locked: true,
                locked_at: now,
            })
            .in('id', gamesToLock.map(g => g.id))

        if (updateError) {
            throw updateError
        }

        // Lock associated picks by calling the database function
        const { error: lockPicksError } = await supabase.rpc('lock_picks_for_started_games')

        if (lockPicksError) {
            console.error('Error locking picks:', lockPicksError)
            // Don't throw - games are locked, picks lock is a secondary operation
        }

        console.log(`✅ Locked ${gamesToLock.length} games, created ${totalAutoPicksCreated} auto-picks`)

        return NextResponse.json({
            success: true,
            message: `Locked ${gamesToLock.length} games, created ${totalAutoPicksCreated} auto-picks`,
            gamesLocked: gamesToLock.length,
            autoPicksCreated: totalAutoPicksCreated,
            gameIds: gamesToLock.map(g => g.api_game_id),
        })

    } catch (error) {
        console.error('Error in lock-games cron:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
