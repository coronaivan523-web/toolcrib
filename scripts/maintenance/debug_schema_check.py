
import asyncio
from app.core.config import settings
from supabase import create_client

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def fix_schema():
    print("--- DEBUG SCHEMA ---")
    
    # 1. Check if columns exist
    try:
        print("Attempting to SELECT position, department from profiles...")
        res = supabase.table('profiles').select('position, department').limit(1).execute()
        print("SUCCESS: Columns 'position' and 'department' exist.")
    except Exception as e:
        print(f"FAILURE: Could not select columns. Error: {e}")
        # If this fails with 406 or similar, it might mean columns don't exist OR cache is stale.

    # 2. Try to find a way to reload schema.
    # Usually we need to run SQL. 
    # Let's check if we have any RPC that runs SQL.
    # Usually 'exec_sql' or similar.
    try:
        print("Attempting to call 'exec_sql' RPC (if exists)...")
        res = supabase.rpc('exec_sql', {'sql_query': "NOTIFY pgrst, 'reload schema';"}).execute()
        print("SUCCESS: Executed NOTIFY via RPC.")
    except Exception as e:
        print(f"RPC 'exec_sql' failed or not found: {e}")

if __name__ == "__main__":
    fix_schema()
