import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function addColumns() {
    console.log('Adding game clock columns...')

    // We can't run raw SQL directly with the JS client, but we can test by updating a game
    // The columns need to be added via Supabase dashboard or CLI

    // Test if columns exist by trying to select them
    const { data, error } = await supabase
        .from('games')
        .select('id, quarter, game_clock')
        .limit(1)

    if (error) {
        console.log('Columns do not exist yet. Please add them via Supabase dashboard:')
        console.log('')
        console.log('ALTER TABLE games ADD COLUMN IF NOT EXISTS quarter INTEGER DEFAULT NULL;')
        console.log('ALTER TABLE games ADD COLUMN IF NOT EXISTS game_clock TEXT DEFAULT NULL;')
        console.log('')
        console.log('Or run this SQL in the Supabase SQL Editor.')
    } else {
        console.log('Columns already exist!')
        console.log('Sample data:', data)
    }
}

addColumns().then(() => process.exit(0))
