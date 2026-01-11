import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data: games } = await supabase.from('games').select('id, season, scheduled_start_time, home_team_id, away_team_id').order('id')

    if (!games) {
        console.log('No games found')
        return
    }

    const teamIds = [...new Set(games.flatMap(g => [g.home_team_id, g.away_team_id]))]
    const { data: teams } = await supabase.from('teams').select('id, abbreviation').in('id', teamIds)
    const teamMap = new Map(teams?.map(t => [t.id, t.abbreviation]) || [])

    console.log('Games in DB:')
    games.forEach(g => {
        const home = teamMap.get(g.home_team_id) || '?'
        const away = teamMap.get(g.away_team_id) || '?'
        const date = new Date(g.scheduled_start_time).toLocaleDateString()
        console.log(`  Game ${g.id} - Season: ${g.season} - ${away} @ ${home} - ${date}`)
    })

    // Group by season
    const bySeason: Record<number, number> = {}
    games.forEach(g => {
        bySeason[g.season] = (bySeason[g.season] || 0) + 1
    })
    console.log('\nGames by season:', bySeason)
}

check().then(() => process.exit(0))
