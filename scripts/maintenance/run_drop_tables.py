
import psycopg2
import sys

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL_MIGRATION = """
DROP TABLE IF EXISTS cycle_count_lines CASCADE;
DROP TABLE IF EXISTS cycle_count_sessions CASCADE;
NOTIFY pgrst, 'reload config';
"""

def apply_migration():
    print(f"Connecting to database to DROP Cycle Counts (CASCADE)...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing DROP SQL...")
        cur.execute(SQL_MIGRATION)
        print("SUCCESS: Tables Dropped (Cascaded).")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
