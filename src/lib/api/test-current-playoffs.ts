import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { RapidApiNFLClient } from './rapidapi-nfl-client'

const client = new RapidApiNFLClient(process.env.RAPIDAPI_KEY!)

async function test() {
    console.log('Testing current season playoff games...\n')

    // Try 2024 season (current)
    const games2024 = await client.fetchPlayoffGames(2024)
    console.log('2024 season playoff games:', games2024.length)

    if (games2024.length > 0) {
        console.log('\nGames found:')
        games2024.forEach(g => {
            const away = g.teams.away.name || 'TBD'
            const home = g.teams.home.name || 'TBD'
            const status = g.game.status.short
            const score = g.scores.away.total !== null ? `${g.scores.away.total}-${g.scores.home.total}` : 'N/A'
            console.log(`  ${away} @ ${home} - ${status} (${score})`)
        })
    }

    // Also try fetching live scores
    console.log('\n\nLive scores:')
    const liveGames = await client.fetchLiveScores()
    console.log('Live games:', liveGames.length)

    if (liveGames.length > 0) {
        liveGames.forEach(g => {
            console.log(`  ${g.teams.away.name} @ ${g.teams.home.name} - ${g.game.status.short}`)
        })
    }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
