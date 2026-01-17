/**
 * Force create a pick even for a locked game by temporarily unlocking
 * This is a one-time fix for the missed auto-pick
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function forceCreatePick() {
    const gameId = 59  // Game 401772982
    const userId = 'b509734d-9046-463f-8163-f666b0920cfd'  // MEBCAB

    console.log('Force creating pick for MEBCAB on game 59...')

    // Get game details
    const { data: game } = await supabase
        .from('games')
        .select('id, home_team_id, away_team_id, season, week_number, is_locked')
        .eq('id', gameId)
        .single()

    if (!game) {
        console.error('Game not found')
        return
    }

    console.log('Game is locked:', game.is_locked)

    // Step 1: Temporarily unlock the game
    console.log('Temporarily unlocking game...')
    const { error: unlockError } = await supabase
        .from('games')
        .update({ is_locked: false })
        .eq('id', gameId)

    if (unlockError) {
        console.error('Error unlocking game:', unlockError)
        return
    }

    // Step 2: Create the pick
    const selectedTeamId = Math.random() < 0.5 ? game.home_team_id : game.away_team_id
    console.log('Creating pick with team:', selectedTeamId)

    const { error: insertError } = await supabase
        .from('picks')
        .insert({
            user_id: userId,
            game_id: gameId,
            selected_team_id: selectedTeamId,
            season: game.season,
            week_number: game.week_number,
        })

    if (insertError) {
        console.error('Error creating pick:', insertError)
    } else {
        console.log('✅ Pick created!')
    }

    // Step 3: Re-lock the game
    console.log('Re-locking game...')
    const { error: lockError } = await supabase
        .from('games')
        .update({ is_locked: true })
        .eq('id', gameId)

    if (lockError) {
        console.error('Error re-locking game:', lockError)
    } else {
        console.log('✅ Game re-locked')
    }

    // Verify
    const { data: pick } = await supabase
        .from('picks')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single()

    console.log('\nVerification:', pick ? 'Pick exists!' : 'Pick NOT found')
    if (pick) {
        const { data: team } = await supabase.from('teams').select('abbreviation').eq('id', pick.selected_team_id).single()
        console.log('Selected team:', team?.abbreviation)
    }
}

forceCreatePick()
