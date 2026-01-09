
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || '2025')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function triggerStats() {
    console.log('🔄 Triggering stat calculation...')

    // 1. Calculate points for completed games
    console.log('   Calculating points for completed games...')
    const { error: pointsError } = await supabase.rpc('calculate_points_for_completed_games')
    if (pointsError) {
        console.error('   ❌ Error calculating points:', pointsError)
    } else {
        console.log('   ✅ Points calculated.')
    }

    // 2. Refresh user stats
    console.log(`   Refreshing user stats for season ${CURRENT_SEASON}...`)
    const { error: statsError } = await supabase.rpc('refresh_user_stats', { p_season: CURRENT_SEASON })
    if (statsError) {
        console.error('   ❌ Error refreshing stats:', statsError)
    } else {
        console.log('   ✅ Stats refreshed.')
    }

    // 3. Verify results
    const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('season', CURRENT_SEASON)
        .limit(3)

    if (stats && stats.length > 0) {
        console.log('\n📊 Sample Stats:')
        stats.forEach(s => {
            console.log(`   User ${s.user_id.substring(0, 6)}...: ${s.total_correct_picks} correct, ${s.total_points} points`)
        })
    } else {
        console.log('\n⚠️  No user stats found after refresh. Are there any picks?')
    }
}

triggerStats()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error)
        process.exit(1)
    })
