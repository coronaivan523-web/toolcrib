
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to parse .env manually
function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2 && !line.trim().startsWith('#')) {
            const key = parts[0].trim();
            let val = parts.slice(1).join('=').trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            env[key] = val;
        }
    });
    return env;
}

// Try reading .env from current dir and parent dir
let env = parseEnv(path.resolve(__dirname, '.env'));
if (!env.VITE_SUPABASE_URL) {
    const parentEnv = parseEnv(path.resolve(__dirname, '../.env'));
    Object.assign(env, parentEnv);
}

// Support both standard and VITE_ prefixed vars
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY || env.SUPABASE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials. Env content keys:", Object.keys(env))
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
            console.log(`Auth ID: ${u.id} | Email: ${u.email}`)
        })
    }
}

checkRoles()
