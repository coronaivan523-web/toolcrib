
import psycopg2
import sys

# Connection string (Copied from run_drop_tables.py)
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL_FIX = """
ALTER TABLE public.cycle_count_sessions ALTER COLUMN planned_date DROP DEFAULT;
ALTER TABLE public.cycle_count_sessions ALTER COLUMN planned_date DROP NOT NULL;
"""

def apply_fix():
    print(f"Connecting to database to fix 'planned_date' column...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing SQL Fix...")
        cur.execute(SQL_FIX)
        print("SUCCESS: 'planned_date' is now Nullable and has no Default.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_fix()
