"""
Apply the cycle count schema fix migration
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Read migration file
with open("supabase/migrations/20260121_fix_cycle_schema.sql", "r") as f:
    migration_sql = f.read()

print("Applying migration: 20260121_fix_cycle_schema.sql")
print("=" * 60)
print(migration_sql)
print("=" * 60)

try:
    # Execute migration
    result = supabase.rpc("exec_sql", {"sql": migration_sql}).execute()
    print("✓ Migration applied successfully!")
    print(f"Result: {result}")
except Exception as e:
    print(f"✗ Error applying migration: {e}")
    print("\nTrying direct execution via postgrest...")
    
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
    for i, stmt in enumerate(statements, 1):
        print(f"\n[{i}/{len(statements)}] Executing: {stmt[:100]}...")
        try:
            result = supabase.rpc("exec_sql", {"sql": stmt}).execute()
            print(f"  ✓ Success")
        except Exception as stmt_error:
            print(f"  ✗ Error: {stmt_error}")
