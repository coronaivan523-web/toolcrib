
import psycopg2
import sys

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL_MIGRATION = """
-- Cycle Count Sessions Table
CREATE TABLE IF NOT EXISTS public.cycle_count_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'DRAFT',
    admin_notes TEXT,
    planned_date DATE DEFAULT CURRENT_DATE,
    count_date DATE DEFAULT CURRENT_DATE, 
    assigned_to UUID REFERENCES auth.users(id)
);

-- Cycle Count Lines Table
-- FIX: location_id implies BIGINT based on error message, checking assumptions.
-- If error says "incompatible types: uuid and bigint", then locations.id is BIGINT.
CREATE TABLE IF NOT EXISTS public.cycle_count_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.cycle_count_sessions(id) ON DELETE CASCADE,
    material_id BIGINT REFERENCES public.materials(id),
    location_id BIGINT REFERENCES public.locations(id), -- Changed to BIGINT
    qty_system INTEGER DEFAULT 0,
    qty_physical INTEGER DEFAULT 0,
    counted_by UUID REFERENCES auth.users(id),
    counted_at TIMESTAMPTZ DEFAULT now(),
    count_date DATE DEFAULT CURRENT_DATE, 
    planned_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

ALTER TABLE cycle_count_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cycle_count_sessions;
CREATE POLICY "Enable all access for authenticated users" ON cycle_count_sessions FOR ALL TO authenticated USING (true);

ALTER TABLE cycle_count_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON cycle_count_lines;
CREATE POLICY "Enable all access for authenticated users" ON cycle_count_lines FOR ALL TO authenticated USING (true);

NOTIFY pgrst, 'reload config';
"""

def apply_migration():
    print(f"Connecting to database to CREATE Cycle Counts V2 (Retry)...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing CREATE SQL...")
        cur.execute(SQL_MIGRATION)
        print("SUCCESS: Tables Created.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
