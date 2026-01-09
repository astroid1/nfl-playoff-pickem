
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function inspectTeams() {
    console.log('🔍 Inspecting Teams Data...')

    const { data: teams, error } = await supabase
        .from('teams')
        .select('id, city, name, abbreviation')
        .order('name')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('\nID | City | Name | Abbrev | Displayed (City + Name)')
    console.log('---|---|---|---|---')
    teams?.forEach(t => {
        console.log(`${t.id} | ${t.city} | ${t.name} | ${t.abbreviation} | "${t.city} ${t.name}"`)
    })
}

inspectTeams()
