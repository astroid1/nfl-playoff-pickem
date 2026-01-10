/**
 * Manually lock games that have started
 * Run with: npx tsx src/lib/api/lock-games-now.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function lockGames() {
    const now = new Date().toISOString()
    console.log(`🔒 Checking for games to lock at ${now}...`)

    // Find all unlocked games that should be locked
    const { data: gamesToLock, error: fetchError } = await supabase
        .from('games')
        .select('id, api_game_id, scheduled_start_time, is_locked')
        .eq('is_locked', false)
        .lte('scheduled_start_time', now)

    if (fetchError) {
        console.error('Error fetching games:', fetchError)
        return
    }

    if (!gamesToLock || gamesToLock.length === 0) {
        console.log('No games to lock.')
        
        // Show current game status
        const { data: allGames } = await supabase
            .from('games')
            .select('id, scheduled_start_time, is_locked, status')
            .order('scheduled_start_time')
        
        console.log('\nCurrent game status:')
        allGames?.forEach(g => {
            const startTime = new Date(g.scheduled_start_time)
            const hasStarted = startTime <= new Date()
            console.log(`  ID ${g.id}: locked=${g.is_locked}, status=${g.status}, started=${hasStarted}, time=${g.scheduled_start_time}`)
        })
        return
    }

    console.log(`Found ${gamesToLock.length} games to lock:`)
    gamesToLock.forEach(g => console.log(`  - Game ${g.api_game_id} (scheduled: ${g.scheduled_start_time})`))

    // Lock the games
    const { error: updateError } = await supabase
        .from('games')
        .update({
            is_locked: true,
            locked_at: now,
        })
        .in('id', gamesToLock.map(g => g.id))

    if (updateError) {
        console.error('Error locking games:', updateError)
        return
    }

    console.log(`✅ Locked ${gamesToLock.length} games!`)
}

lockGames()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error)
        process.exit(1)
    })
