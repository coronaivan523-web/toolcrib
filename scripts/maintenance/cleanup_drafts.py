
import psycopg2
from app.core.config import settings

# Manual connection string as fallback if settings fails or for direct script usage
# Using the one from run_drop_tables.py
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL_DELETE = "DELETE FROM public.cycle_count_sessions WHERE status = 'DRAFT';"

def delete_drafts():
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing DELETE DRAFTS...")
        cur.execute(SQL_DELETE)
        rows_deleted = cur.rowcount
        print(f"SUCCESS: Deleted {rows_deleted} draft sessions.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    delete_drafts()
