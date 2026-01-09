/**
 * Cron job to calculate user statistics for leaderboard
 * Runs every 5 minutes via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRON_SECRET = process.env.CRON_SECRET
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = await createClient()

        // Call the database function to refresh user stats
        const { error } = await supabase.rpc('refresh_user_stats', {
            p_season: CURRENT_SEASON,
        })

        if (error) {
            throw error
        }

        // Get count of updated stats
        const { count } = await supabase
            .from('user_stats')
            .select('*', { count: 'exact', head: true })
            .eq('season', CURRENT_SEASON)

        console.log(`✅ Refreshed stats for ${count} users`)

        return NextResponse.json({
            success: true,
            message: `Refreshed stats for ${count} users`,
            season: CURRENT_SEASON,
            usersUpdated: count || 0,
        })

    } catch (error) {
        console.error('Error in calculate-stats cron:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
