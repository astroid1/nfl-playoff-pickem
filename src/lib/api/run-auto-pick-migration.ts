/**
 * Script to run the auto-pick column migration
 * Run with: npx ts-node -r tsconfig-paths/register src/lib/api/run-auto-pick-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
    console.log('Running auto-pick column migration...')

    // Add is_auto_pick column to picks table
    const { error } = await supabase.rpc('exec_sql', {
        sql: `
            ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_auto_pick BOOLEAN DEFAULT FALSE;
            COMMENT ON COLUMN picks.is_auto_pick IS 'True if this pick was automatically generated for a user who missed the deadline';
        `
    })

    if (error) {
        // Try direct approach - column might already exist or we need to use raw SQL
        console.log('RPC not available, checking if column exists...')

        // Check if column exists by selecting from it
        const { data, error: selectError } = await supabase
            .from('picks')
            .select('is_auto_pick')
            .limit(1)

        if (selectError && selectError.message.includes('is_auto_pick')) {
            console.error('Column does not exist and could not be created via RPC.')
            console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
            console.log(`
ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_auto_pick BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN picks.is_auto_pick IS 'True if this pick was automatically generated for a user who missed the deadline';
            `)
            return
        }

        console.log('Column already exists or was created successfully!')
    } else {
        console.log('Migration completed successfully!')
    }

    // Verify the column exists
    const { data: verifyData, error: verifyError } = await supabase
        .from('picks')
        .select('id, is_auto_pick')
        .limit(1)

    if (verifyError) {
        console.error('Verification failed:', verifyError.message)
    } else {
        console.log('Verified: is_auto_pick column exists')
        console.log('Sample data:', verifyData)
    }
}

runMigration().catch(console.error)
