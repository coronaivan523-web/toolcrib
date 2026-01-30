
import psycopg2
import sys

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL_MIGRATION = """
-- Add created_at column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
"""

def apply_fix():
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing SQL to add created_at...")
        cur.execute(SQL_MIGRATION)
        print("SUCCESS: Column created_at added (or already existed).")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_fix()
