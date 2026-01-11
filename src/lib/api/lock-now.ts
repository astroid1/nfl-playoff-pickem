import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function lockGames() {
    const now = new Date().toISOString()
    console.log('Current time:', now)

    // Find games that should be locked
    const { data: gamesToLock, error: fetchError } = await supabase
        .from('games')
        .select('id, api_game_id, scheduled_start_time')
        .eq('is_locked', false)
        .lte('scheduled_start_time', now)

    if (fetchError) {
        console.error('Error fetching games:', fetchError)
        return
    }

    console.log('Games to lock:', gamesToLock)

    if (!gamesToLock || gamesToLock.length === 0) {
        console.log('No games need locking')
        return
    }

    // Lock the games
    const { error: updateError } = await supabase
        .from('games')
        .update({ is_locked: true, locked_at: now })
        .in('id', gamesToLock.map(g => g.id))

    if (updateError) {
        console.error('Error locking games:', updateError)
    } else {
        console.log('✅ Locked', gamesToLock.length, 'games')
    }

    // Lock associated picks
    const { error: pickError } = await supabase.rpc('lock_picks_for_started_games')
    if (pickError) {
        console.error('Error locking picks:', pickError)
    } else {
        console.log('✅ Picks locked')
    }
}

lockGames().then(() => process.exit(0))
