
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env from parent directory or current
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRoles() {
    console.log("--- Checking Profiles ---")
    const { data: profiles, error } = await supabase.from('profiles').select('*')
    if (error) {
        console.error("Error fetching profiles:", error)
    } else {
        profiles.forEach(p => {
            console.log(`ID: ${p.id} | Email: ${p.email} | Role: ${p.role} | Name: ${p.full_name}`)
        })
    }

    console.log("\n--- Checking Auth Users ---")
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
        console.error("Error fetching users:", authError)
    } else {
        users.forEach(u => {
            console.log(`Auth ID: ${u.id} | Email: ${u.email} | Last Sign In: ${u.last_sign_in_at}`)
        })
    }
}

checkRoles()
