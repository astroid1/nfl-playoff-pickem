import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const now = new Date()
    console.log('Current time (UTC):', now.toISOString())
    console.log('Current time (ET):', now.toLocaleString('en-US', { timeZone: 'America/New_York' }))

    const { data: games } = await supabase
        .from('games')
        .select('id, scheduled_start_time, is_locked, status, home_team_id, away_team_id')
        .order('scheduled_start_time')

    if (!games) return

    const teamIds = [...new Set(games.flatMap(g => [g.home_team_id, g.away_team_id]))]
    const { data: teams } = await supabase.from('teams').select('id, abbreviation').in('id', teamIds)
    const teamMap = new Map(teams?.map(t => [t.id, t.abbreviation]) || [])

    console.log('\nGames:')
    games.forEach(g => {
        const home = teamMap.get(g.home_team_id)
        const away = teamMap.get(g.away_team_id)
        const startTime = new Date(g.scheduled_start_time)
        const isPast = startTime < now
        const startET = startTime.toLocaleString('en-US', { timeZone: 'America/New_York' })
        const marker = isPast && !g.is_locked ? ' ⚠️ SHOULD BE LOCKED' : ''
        console.log(`  ${away} @ ${home} - Start: ${startET} - Locked: ${g.is_locked} - Status: ${g.status}${marker}`)
    })
}

check().then(() => process.exit(0))
