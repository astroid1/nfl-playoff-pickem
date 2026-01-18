import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  // Check MEBCAB's pick for game 59
  const { data: pick, error } = await supabase
    .from('picks')
    .select('id, user_id, game_id, is_auto_pick, selected_team_id')
    .eq('game_id', 59)
    .eq('user_id', 'b509734d-9046-463f-8163-f666b0920cfd')
    .single()

  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('MEBCAB pick for game 59:')
    console.log('  is_auto_pick:', pick.is_auto_pick)
    console.log('  selected_team_id:', pick.selected_team_id)
  }

  // Check all auto-picks
  const { data: autoPicks } = await supabase
    .from('picks')
    .select('id, user_id, game_id, is_auto_pick')
    .eq('is_auto_pick', true)

  console.log('\nAll auto-picks:', autoPicks?.length || 0)
  autoPicks?.forEach(p => console.log(`  Game ${p.game_id}, User ${p.user_id}`))
}

check()
