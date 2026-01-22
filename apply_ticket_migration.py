
import os
import sys
import psycopg2

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Migration file
MIGRATION_FILE = r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\add_ticket_id_column.sql"

def apply_migration():
    print(f"--- Applying Migration: {MIGRATION_FILE} ---")
    
    try:
        with open(MIGRATION_FILE, "r") as f:
            sql = f.read()
            
        print(f"Loaded SQL ({len(sql)} chars)")
        
        # Connect
        print(f"Connecting to {DB_URL.split('@')[1]}...")
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            print("Executing SQL...")
            cur.execute(sql)
            print("Migration executed successfully.")
            
            # Verify
            print("Verifying column...")
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='cycle_count_sessions' AND column_name='ticket_id'")
            res = cur.fetchone()
            if res:
                print("Column 'ticket_id' found!")
                
                # Notify PostgREST to reload schema
                print("Reloading PostgREST schema cache...")
                cur.execute("NOTIFY pgrst, 'reload schema'")
                print("Reload signal sent.")
            else:
                print("WARNING: Column NOT found after execution.")
            
        conn.close()
        
    except Exception as e:
        print(f"Migration Failed: {e}")

if __name__ == "__main__":
    apply_migration()
