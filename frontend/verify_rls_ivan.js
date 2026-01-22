
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2 && !line.trim().startsWith('#')) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            env[key] = val;
        }
    });
    return env;
}

let env = parseEnv(path.resolve(__dirname, '.env'));
if (!env.VITE_SUPABASE_URL) Object.assign(env, parseEnv(path.resolve(__dirname, '../.env')));

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAccess() {
    console.log("--- Logging in as ivan.corona@wasion.cn ---")
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'ivan.corona@wasion.cn',
        password: 'Wasion2024!'
    })

    if (loginError) {
        console.error("Login failed:", loginError.message)
        return
    }

    console.log("Login successful. User ID:", session.user.id)

    console.log("--- Fetching Profile (RLS Check) ---")
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

    if (error) {
        console.error("❌ Error fetching profile:", error)
    } else {
        console.log("✅ Profile fetched successfully:", data)
    }
}

checkAccess()
