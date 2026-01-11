import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'nfl-api-data.p.rapidapi.com'
const BASE_URL = 'https://nfl-api-data.p.rapidapi.com'

async function fetchRaw(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
    })

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY!,
            'x-rapidapi-host': RAPIDAPI_HOST,
        },
    })

    return response.json()
}

async function debug() {
    console.log('Fetching all 2024 games...\n')

    const data = await fetchRaw('/nfl-scoreboard', { year: 2024 })

    if (data.events) {
        console.log('Total events:', data.events.length)

        // Group by season type
        const byType: Record<string, any[]> = {}
        for (const event of data.events) {
            const seasonType = event.season?.type || 'unknown'
            if (!byType[seasonType]) byType[seasonType] = []
            byType[seasonType].push(event)
        }

        console.log('\nBy season type:')
        for (const [type, events] of Object.entries(byType)) {
            console.log(`  Type ${type}: ${events.length} games`)
        }

        // Find playoff games (type 3)
        const playoffs = byType['3'] || []
        console.log('\n\nPlayoff games (type 3):')
        if (playoffs.length > 0) {
            playoffs.slice(0, 6).forEach((g: any) => {
                const home = g.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')
                const away = g.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')
                console.log(`  ${away?.team?.displayName || 'TBD'} @ ${home?.team?.displayName || 'TBD'} - ${g.status?.type?.name}`)
            })
        } else {
            console.log('  No playoff games found')
        }

        // Check most recent games
        console.log('\n\nMost recent games (by date):')
        const sorted = [...data.events].sort((a: any, b: any) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime()
        })
        sorted.slice(0, 5).forEach((g: any) => {
            const home = g.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')
            const away = g.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')
            console.log(`  ${g.date}: ${away?.team?.displayName} @ ${home?.team?.displayName} - ${g.status?.type?.name} (type: ${g.season?.type})`)
        })
    }
}

debug().catch(console.error)
