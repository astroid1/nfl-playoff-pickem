/**
 * Swap home/away teams for Conference Championship game
 * DEN should be home, NE should be away
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function swapTeams() {
  // Get the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, api_game_id, home_team_id, away_team_id')
    .eq('api_game_id', 'MANUAL-2025-CONF-1')
    .single()

  if (gameError || !game) {
    console.error('Game not found:', gameError)
    return
  }

  console.log('Current game:', game)
  console.log('Swapping home_team_id and away_team_id...')

  // Swap home and away team IDs
  const { error: updateError } = await supabase
    .from('games')
    .update({
      home_team_id: game.away_team_id,
      away_team_id: game.home_team_id,
    })
    .eq('id', game.id)

  if (updateError) {
    console.error('Error updating:', updateError)
    return
  }

  // Verify
  const { data: updated } = await supabase
    .from('games')
    .select('id, api_game_id, home_team:teams!home_team_id(abbreviation), away_team:teams!away_team_id(abbreviation)')
    .eq('id', game.id)
    .single() as any

  console.log('Updated game:', updated)
  console.log('Home team:', updated.home_team.abbreviation)
  console.log('Away team:', updated.away_team.abbreviation)

  // Check if any picks exist for this game
  const { data: picks } = await supabase
    .from('picks')
    .select('id, user_id, selected_team_id')
    .eq('game_id', game.id)

  console.log('Existing picks:', picks?.length || 0)
  if (picks && picks.length > 0) {
    console.log('Picks are unchanged - team selections preserved')
  }
}

swapTeams()
