
import psycopg2
import os

# Credentials from run_migration_node.js (Hardcoded for this fix script to ensure it works)
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def apply_fix():
    print("Connecting to DB...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected. Applying fixes...")
        
        # 1. Ensure Table Exists (Standard create)
        sql_create = """
        create type public.movement_type as enum ('CYCLE_COUNT', 'REQUISITION', 'RECEIPT', 'ADJUSTMENT');
        EXCEPTION WHEN duplicate_object THEN null;
        """
        # Execute Enum creation safely
        try:
            cur.execute("create type public.movement_type as enum ('CYCLE_COUNT', 'REQUISITION', 'RECEIPT', 'ADJUSTMENT');")
        except psycopg2.errors.DuplicateObject:
            print("Enum movement_type already exists.")
        
        create_table = """
        create table if not exists public.inventory_movements (
            id uuid default gen_random_uuid() primary key,
            material_id bigint references public.materials(id) on delete cascade not null,
            quantity_change integer not null,
            new_stock_level integer not null,
            previous_stock_level integer not null,
            movement_type public.movement_type not null,
            reference_id text,
            reason text,
            created_at timestamptz default now()
        );
        """
        cur.execute(create_table)
        print("Table structure ensured.")

        # 2. Add 'created_by' column if missing
        alter_table = """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='created_by') THEN
                ALTER TABLE public.inventory_movements ADD COLUMN created_by uuid references auth.users(id);
                PRINT 'Added column created_by';
            ELSE
                RAISE NOTICE 'Column created_by already exists';
            END IF;
        END
        $$;
        """
        # Simpler check: Just try to add it, ignore if exists? 
        # Postgres "ADD COLUMN IF NOT EXISTS" is supported in newer versions (9.6+), Supabase is usually 15.
        
        try:
            cur.execute("ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_by uuid references auth.users(id);")
            print("Verified 'created_by' column.")
        except Exception as e:
            print(f"Warn: {e}")

        # 3. Reload Schema Cache (Critical for PostgRest to see changes)
        cur.execute("NOTIFY pgrst, 'reload schema';")
        print("Notified PostgREST to reload schema.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("Connection closed.")

if __name__ == "__main__":
    apply_fix()
