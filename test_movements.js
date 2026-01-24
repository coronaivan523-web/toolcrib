
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env manually since we are in a scratch folder structure
const envPath = path.resolve(process.cwd(), '.env')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabaseUrl = envConfig.VITE_SUPABASE_URL || envConfig.SupabaseUrl || process.env.VITE_SUPABASE_URL
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY || envConfig.SupabaseKey || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
    console.log("Testing insertion into inventory_movements...")

    // 1. Get a material
    const { data: materials, error: matError } = await supabase.from('materials').select('id').limit(1)
    if (matError || !materials.length) {
        console.error("No materials found:", matError)
        return
    }
    const materialId = materials[0].id

    const payload = {
        material_id: materialId,
        quantity_change: 1,
        new_stock_level: 100,
        previous_stock_level: 99,
        movement_type: "CYCLE_COUNT",
        reason: "JS Test Insert",
        // Skipping created_by to avoid auth issues if not authed
    }

    const { data, error } = await supabase.from('inventory_movements').insert(payload).select()

    if (error) {
        console.error("FAILURE:", error)
        console.log("Error details:", JSON.stringify(error, null, 2))
    } else {
        console.log("SUCCESS: Inserted record:", data)
        // Cleanup
        if (data && data.length > 0) {
            await supabase.from('inventory_movements').delete().eq('id', data[0].id)
            console.log("Cleanup successful.")
        }
    }
}

testInsert()
