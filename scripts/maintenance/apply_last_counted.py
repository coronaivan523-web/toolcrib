
import psycopg2
import os

# Credentials (Hardcoded for this maintenance task)
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def apply_migration():
    print("Connecting to DB...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected. Adding 'last_counted_at' column...")
        
        sql = """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='last_counted_at') THEN
                ALTER TABLE public.materials ADD COLUMN last_counted_at timestamptz;
                RAISE NOTICE 'Added column last_counted_at';
            ELSE
                RAISE NOTICE 'Column last_counted_at already exists';
            END IF;
        END
        $$;
        """
        cur.execute(sql)
        
        # Reload Schema for PostgRest
        cur.execute("NOTIFY pgrst, 'reload schema';")
        print("Migration applied and Schema cache reloaded.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    apply_migration()
