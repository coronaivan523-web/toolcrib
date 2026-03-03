import psycopg2

DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def run_query(q):
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(q)
        res = cur.fetchall()
        cur.close()
        conn.close()
        return res
    except Exception as e:
        return str(e)

# Tables
tables = run_query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
print("TABLES:", tables)

# FKs
fks = run_query("""
SELECT conname,
       conrelid::regclass AS table_from,
       confrelid::regclass AS table_to
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
""")
print("FKS:", fks)

# Check constraints
checks = run_query("""
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype = 'c' AND conrelid = 'public.materials'::regclass;
""")
print("CHECKS on materials:", checks)

# RLS Policies
rls = run_query("SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';")
print("RLS POLICIES:", rls)

# Def of materials constraints
cols = run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials';")
print("MATERIALS COLS:", cols)

cols2 = run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_movements';")
print("INVENTORY MOVEMENTS COLS:", cols2)

cols3 = run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets';")
print("TICKETS COLS:", cols3)

cols4 = run_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles';")
print("PROFILES COLS:", cols4)

