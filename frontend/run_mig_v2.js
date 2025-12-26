import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Connection string
const connectionString = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
const client = new Client({ connectionString });

async function runMigration() {
    try {
        await client.connect();
        console.log("Connected to database...");

        const sqlPath = path.join(__dirname, '../supabase/migrations/20251226_add_cause_to_items.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration...");
        await client.query(sql);
        console.log("Migration executed successfully!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
