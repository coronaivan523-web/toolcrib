
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Use the direct connection string (pooler) 
DB_URL = "postgres://postgres.tbrjwdmscqjluujzopij:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" 
# Re-using the known working connection string format from previous scripts (apply_ticket_migration.py)
# Ideally we should read from .env but for reliability in this scratchpad environment I'll grab it from the env vars or fell back to known structure if env fails.
# Actually, let's try to read os.environ['DATABASE_URL']
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
     # Hardcode fallback based on previous successful scripts if needed, but let's try env first
     # The user's previous script had:
     DB_URL = "postgres://postgres.tbrjwdmscqjluujzopij:Wasion2024.@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

MIGRATION_FILE = "supabase/migrations/20260121_create_inventory_movements.sql"

def apply_migration():
    if not os.path.exists(MIGRATION_FILE):
        print(f"Error: Migration file {MIGRATION_FILE} not found.")
        return

    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        with open(MIGRATION_FILE, 'r') as f:
            sql = f.read()
            
        print(f"Applying migration: {MIGRATION_FILE}")
        cur.execute(sql)
        conn.commit()
        print("Migration applied successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    apply_migration()
