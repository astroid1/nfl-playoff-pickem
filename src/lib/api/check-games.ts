import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data: games, error } = await supabase
        .from('games')
        .select('id, status, home_team_score, away_team_score, home_team_id, away_team_id, winning_team_id')
        .order('id')

    if (error) {
        console.error('Error:', error.message)
        return
    }

    // Get team names
    const teamIds = [...new Set(games.flatMap(g => [g.home_team_id, g.away_team_id]))]
    const { data: teams } = await supabase.from('teams').select('id, abbreviation').in('id', teamIds)
    const teamMap = new Map(teams?.map(t => [t.id, t.abbreviation]) || [])

    console.log('Current Games:')
    games.forEach(g => {
        const home = teamMap.get(g.home_team_id) || '?'
        const away = teamMap.get(g.away_team_id) || '?'
        const winner = g.winning_team_id ? teamMap.get(g.winning_team_id) : 'none'
        console.log(`  Game ${g.id}: ${away} @ ${home} - Status: ${g.status}, Score: ${g.away_team_score ?? '-'}-${g.home_team_score ?? '-'}, Winner: ${winner}`)
    })
}
check().then(() => process.exit(0))
