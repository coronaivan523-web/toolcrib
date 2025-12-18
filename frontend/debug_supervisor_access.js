
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import os from 'os'
import fs from 'fs'

// Load environment variables
const envPath = path.resolve('C:\\Users\\Ivan.Corona\\.gemini\\antigravity\\scratch\\toolcrib\\frontend\\.env')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabaseUrl = envConfig.VITE_SUPABASE_URL
const supabaseAnonKey = envConfig.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSupervisorPermissions() {
    console.log("Logging in as supervisor...")
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'supervisor.test@wasion.cn',
        password: 'password123'
    })

    if (loginError) {
        console.error("Login failed:", loginError)
        return
    }

    console.log("Login successful. User ID:", user.id)

    // finding a material
    const { data: materials } = await supabase.from('materials').select('id, current_stock').limit(1).single()
    if (!materials) {
        console.error("No materials found")
        return
    }

    console.log("Attempting to update material:", materials.id)
    const { error: updateError } = await supabase
        .from('materials')
        .update({ current_stock: materials.current_stock }) // No change, just testing permission
        .eq('id', materials.id)

    if (updateError) {
        console.error("Update FAILED (RLS likely):", updateError)
    } else {
        console.log("Update SUCCESSFUL")
    }
}

testSupervisorPermissions()
