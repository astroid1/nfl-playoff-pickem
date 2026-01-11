/**
 * Cron job to calculate user statistics for leaderboard
 * Runs every 5 minutes via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const CRON_SECRET = process.env.CRON_SECRET
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

export async function GET(request: NextRequest) {
    // Verify cron secret - Vercel cron uses Authorization header or x-vercel-cron
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'

    if (!isVercelCron && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = createServiceClient()

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
