
import psycopg2

DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def apply_migration():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Adding 'status' column to cycle_count_lines...")
        cur.execute("ALTER TABLE public.cycle_count_lines ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';")
        
        # Backfill
        print("Backfilling status...")
        cur.execute("UPDATE public.cycle_count_lines SET status = 'COUNTED' WHERE qty_physical IS NOT NULL AND status = 'PENDING';")
        
        cur.execute("NOTIFY pgrst, 'reload schema';")
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn: conn.close()

if __name__ == "__main__":
    apply_migration()
