/**
 * Debug script to check auto-pick state and manually trigger for a game
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debug() {
    console.log('=== Auto-Pick Debug ===\n')

    // Get all users
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, username')

    if (usersError) {
        console.error('Error fetching users:', usersError)
        return
    }
    console.log(`Total users: ${users?.length || 0}`)
    users?.forEach(u => console.log(`  - ${u.username} (${u.id})`))

    // Get locked games
    const { data: lockedGames, error: gamesError } = await supabase
        .from('games')
        .select('id, api_game_id, home_team_id, away_team_id, season, week_number, is_locked')
        .eq('is_locked', true)

    if (gamesError) {
        console.error('Error fetching games:', gamesError)
        return
    }
    console.log(`\nLocked games: ${lockedGames?.length || 0}`)

    // For each locked game, check picks
    for (const game of (lockedGames || [])) {
        console.log(`\nGame: ${game.api_game_id} (ID: ${game.id})`)

        const { data: picks, error: picksError } = await supabase
            .from('picks')
            .select('user_id, selected_team_id')
            .eq('game_id', game.id)

        if (picksError) {
            console.error('  Error fetching picks:', picksError)
            continue
        }

        const usersWithPicks = new Set(picks?.map(p => p.user_id) || [])
        const usersWithoutPicks = users?.filter(u => !usersWithPicks.has(u.id)) || []

        console.log(`  Picks: ${picks?.length || 0}/${users?.length || 0}`)

        if (usersWithoutPicks.length > 0) {
            console.log(`  Missing picks from:`)
            usersWithoutPicks.forEach(u => console.log(`    - ${u.username}`))
        }
    }

    // Ask if we should create auto-picks now
    console.log('\n=== Manual Auto-Pick ===')
    console.log('To create auto-picks for missing users, the is_auto_pick column must exist.')
    console.log('Run this SQL in Supabase first:')
    console.log('ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_auto_pick BOOLEAN DEFAULT FALSE;')
}

async function createAutoPicksForGame(gameId: number) {
    console.log(`\nCreating auto-picks for game ${gameId}...`)

    // Get game details
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id, api_game_id, home_team_id, away_team_id, season, week_number')
        .eq('id', gameId)
        .single()

    if (gameError || !game) {
        console.error('Error fetching game:', gameError)
        return
    }

    // Get all users
    const { data: users } = await supabase.from('profiles').select('id')
    const allUserIds = users?.map(u => u.id) || []

    // Get existing picks
    const { data: existingPicks } = await supabase
        .from('picks')
        .select('user_id')
        .eq('game_id', gameId)

    const usersWithPicks = new Set(existingPicks?.map(p => p.user_id) || [])
    const usersWithoutPicks = allUserIds.filter(id => !usersWithPicks.has(id))

    console.log(`Users without picks: ${usersWithoutPicks.length}`)

    if (usersWithoutPicks.length === 0) {
        console.log('All users have picks!')
        return
    }

    // Create auto-picks
    const autoPicksToInsert = usersWithoutPicks.map(userId => {
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

    console.log('Auto-picks to insert:', autoPicksToInsert)

    const { error: insertError } = await supabase
        .from('picks')
        .insert(autoPicksToInsert)

    if (insertError) {
        console.error('Error inserting auto-picks:', insertError)
        if (insertError.message.includes('is_auto_pick')) {
            console.log('\n⚠️  The is_auto_pick column does not exist!')
            console.log('Run this SQL in Supabase SQL Editor first:')
            console.log('ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_auto_pick BOOLEAN DEFAULT FALSE;')
        }
    } else {
        console.log(`✅ Created ${autoPicksToInsert.length} auto-picks!`)
    }
}

// Run debug
debug()

// Uncomment and set game ID to create auto-picks for a specific game:
// createAutoPicksForGame(7)  // Replace 7 with actual game ID
