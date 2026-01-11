import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'nfl-api-data.p.rapidapi.com'

async function test() {
    const response = await fetch('https://nfl-api-data.p.rapidapi.com/nfl-scoreboard?year=2025', {
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY!,
            'x-rapidapi-host': RAPIDAPI_HOST,
        },
    })
    const data = await response.json()
    console.log('2025 events:', data.events?.length || 0)
    if (data.events?.length > 0) {
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

        console.log('\nSample games:')
        data.events.slice(0, 10).forEach((g: any) => {
            const home = g.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'home')
            const away = g.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === 'away')
            console.log(`  ${g.date} - ${away?.team?.displayName} @ ${home?.team?.displayName} - ${g.status?.type?.name} (type: ${g.season?.type})`)
        })
    } else if (data.error) {
        console.log('Error:', data.error)
    }
}
test().catch(console.error)
