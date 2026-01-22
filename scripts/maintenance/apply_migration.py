
import os
import sys
import psycopg2
from urllib.parse import urlparse

# Connection string from .env (commented out there, but we try to use it)
# postgresql+psycopg2://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
# Note: Pooler usually uses 6543 for transaction mode or 5432 for session.  Direct connection usually 5432.
# The URL in env was 5432. Let's try 5432 first.
DB_URL_DIRECT = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
# Let's try the exact one from .env but with postgresql:// protocol
DB_URL_TRY = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Reading the migration file
MIGRATION_FILE = r"c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\supabase\migrations\20260115_fix_rework_status.sql"

def apply_migration():
    print("--- Applying Migration ---")
    
    try:
        with open(MIGRATION_FILE, "r") as f:
            sql = f.read()
            
        print(f"Loaded SQL from {MIGRATION_FILE}")
        
        # Connect
        conn = psycopg2.connect(DB_URL_TRY)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            cur.execute(sql)
            print("Migration executed successfully.")
            
        conn.close()
        
    except Exception as e:
        print(f"Migration Failed: {e}")

if __name__ == "__main__":
    apply_migration()
