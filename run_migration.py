import os
import psycopg2

# Connection string manually extracted from .env
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

MIGRATION_FILE_1 = r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\supabase\migrations\20241214_add_event_evidence.sql"
MIGRATION_FILE_2 = r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\supabase\migrations\20241214_add_modifier_details.sql"

def run_migration():
    try:
        print(f"Connecting to database...")
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        for migration_file in [MIGRATION_FILE_1, MIGRATION_FILE_2]:
            if os.path.exists(migration_file):
                print(f"Reading migration file: {migration_file}")
                with open(migration_file, 'r') as f:
                    sql = f.read()
                
                print(f"Executing SQL from {os.path.basename(migration_file)}...")
                cur.execute(sql)
                conn.commit()
                print("Success.")
            else:
                print(f"File not found: {migration_file}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    run_migration()
