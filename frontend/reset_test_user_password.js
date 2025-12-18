
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

// Load env vars
let env = parseEnv(path.resolve(__dirname, '.env'));
if (!env.VITE_SUPABASE_URL) Object.assign(env, parseEnv(path.resolve(__dirname, '../.env')));

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TARGET_EMAIL = "user.test@wasion.cn"
const NEW_PASS = "123456"

async function resetPassword() {
    console.log(`--- Resetting Password for: ${TARGET_EMAIL} ---`)

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
        console.error("Error listing users:", listError)
        return
    }

    const user = users.find(u => u.email === TARGET_EMAIL)

    if (user) {
        console.log(`User found (ID: ${user.id}). Updating password...`)
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: NEW_PASS,
            email_confirm: true
        })
        if (updateError) console.error("Error updating password:", updateError)
        else console.log("Password updated successfully.")
    } else {
        console.error("User not found!")
    }
}

resetPassword()
