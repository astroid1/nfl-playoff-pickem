/**
 * Cron job to lock games that have started
 * Runs every minute via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = await createClient()
        const now = new Date().toISOString()

        // Find all unlocked games that should be locked
        const { data: gamesToLock, error: fetchError } = await supabase
            .from('games')
            .select('id, api_game_id, scheduled_start_time')
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
            })
        }

        // Lock the games
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

        console.log(`✅ Locked ${gamesToLock.length} games`)

        return NextResponse.json({
            success: true,
            message: `Locked ${gamesToLock.length} games`,
            gamesLocked: gamesToLock.length,
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
