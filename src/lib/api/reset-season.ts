
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || '2025')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function resetSeason() {
    console.log(`🗑️  Resetting data for Season ${CURRENT_SEASON}...`)

    // 1. Delete all picks for the season
    console.log('   Deleting all picks...')
    const { error: picksError } = await supabase
        .from('picks')
        .delete()
        .eq('season', CURRENT_SEASON)

    if (picksError) {
        console.error('   ❌ Error deleting picks:', picksError)
        return
    }
    console.log('   ✅ Picks deleted.')

    // 2. Reset user stats
    // We can delete the rows (they'll be recreated) or update to 0
    console.log('   Resetting user stats...')
    const { error: statsError } = await supabase
        .from('user_stats')
        .delete()
        .eq('season', CURRENT_SEASON)

    if (statsError) {
        console.error('   ❌ Error resetting stats:', statsError)
        return
    }
    console.log('   ✅ User stats cleared (will regenerate on next login/action).')

    // 3. Optional: Clear games? No, the games look correct (scheduled).
    // But we should ensure no games are marked 'final' if they aren't.
    // The seed script handled upsert, but let's double check.

    console.log('\n✨ Reset complete. The leaderboard should now be empty/zero.')
}

resetSeason()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error)
        process.exit(1)
    })
