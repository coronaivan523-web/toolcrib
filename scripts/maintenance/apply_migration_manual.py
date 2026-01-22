
import psycopg2
import sys

# Connection string from .env (commented out but retrieved)
# Using the pooler URL (usually port 5432 or 6543)
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL_MIGRATION = """
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS plant text DEFAULT 'Planta 1';

NOTIFY pgrst, 'reload schema';
"""

def apply_migration():
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing migration SQL...")
        cur.execute(SQL_MIGRATION)
        print("SUCCESS: Migration executed.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
