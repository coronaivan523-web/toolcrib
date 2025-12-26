import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Using same credential as confirmed working in previous scripts/env
const DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

const MIGRATION_FILE = path.resolve(__dirname, '../supabase/migrations/20251223_fix_requisition_fk.sql')

async function runMigration() {
    console.log("Connecting to DB...")
    const client = new pg.Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log("Connected.")

        if (fs.existsSync(MIGRATION_FILE)) {
            const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8')
            console.log(`Executing SQL from ${path.basename(MIGRATION_FILE)}...`)
            await client.query(sql)
            console.log("Migration applied successfully.")
        } else {
            console.error(`File not found: ${MIGRATION_FILE}`)
        }

    } catch (e) {
        console.error("Migration error:", e)
    } finally {
        await client.end()
    }
}

runMigration()
