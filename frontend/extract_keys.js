
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
// Try finding .env in obvious places
let env = {};
const paths = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve('C:\\Users\\Ivan.Corona\\.gemini\\antigravity\\scratch\\toolcrib\\.env')
];

for (const p of paths) {
    console.log(`Checking: ${p}`);
    if (fs.existsSync(p)) {
        console.log(`Found .env at ${p}`);
        Object.assign(env, parseEnv(p));
    }
}

console.log('--- KEYS ---');
console.log('URL:', env.VITE_SUPABASE_URL || env.SUPABASE_URL);
console.log('SERVICE_KEY:', env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY);
