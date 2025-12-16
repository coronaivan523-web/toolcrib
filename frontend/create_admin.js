
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

// Use SERVICE KEY for admin actions (creating users, setting roles)
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const NEW_ADMIN_EMAIL = "ivan.corona@wasion.cn"
const NEW_ADMIN_PASS = "Wasion2024!" // Strong default password
const NEW_ADMIN_NAME = "Ivan Corona"

async function setupAdmin() {
    console.log(`--- Setting up Admin: ${NEW_ADMIN_EMAIL} ---`)

    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
        console.error("Error listing users:", listError)
        return
    }

    let userId = null
    const existingUser = users.find(u => u.email === NEW_ADMIN_EMAIL)

    if (existingUser) {
        console.log("User already exists. Updating password and metadata...")
        userId = existingUser.id
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
            password: NEW_ADMIN_PASS,
            user_metadata: { full_name: NEW_ADMIN_NAME },
            email_confirm: true
        })
        if (updateError) console.error("Error updating user:", updateError)
        else console.log("User updated.")
    } else {
        console.log("Creating new user...")
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: NEW_ADMIN_EMAIL,
            password: NEW_ADMIN_PASS,
            email_confirm: true,
            user_metadata: { full_name: NEW_ADMIN_NAME }
        })
        if (createError) {
            console.error("Error creating user:", createError)
            return
        }
        userId = newUser.user.id
        console.log("User created.")
    }

    // 2. Set Role in Profiles to 'admin'
    console.log(`Setting role 'admin' for user ID: ${userId}`)

    // First ensure profile exists (trigger might have handled it, but let's be safe/force it)
    const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        email: NEW_ADMIN_EMAIL,
        full_name: NEW_ADMIN_NAME,
        role: 'admin'
    })

    if (upsertError) console.error("Error setting admin role:", upsertError)
    else console.log("Admin role set successfully.")

    // 3. Demote other admins (clean up)
    console.log("Ensuring only this user is admin...")
    const { error: demoteError } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .neq('id', userId)
        .eq('role', 'admin')

    if (demoteError) console.error("Error demoting others:", demoteError)
    else console.log("Other admins demoted.")

}

setupAdmin()
