import os
from supabase import create_client, Client

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception as e:
    print(f"Warning: Could not read .env: {e}")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars")
    exit(1)

supabase: Client = create_client(url, key)

sql = """
ALTER TABLE public.requisitions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

UPDATE public.requisitions 
SET created_by = requester_id 
WHERE created_by IS NULL;
"""

print("Applying migration...")
try:
    # Use the RPC 'exec_sql' if available, or just raw query if possible through py-supabase (it's not usually)
    # Actually, py-supabase doesn't support arbitrary SQL execution on public schema easily without an RPC function.
    # But we previously saw 'run_migration.py' usage or similar.
    # Let's try to use the 'postgres_query' RPC if it exists, or fallback to the known 'exec_sql' pattern if the user has it.
    # Checking file list... 'apply_migration_dummy.py' exists.
    # Let's try to use the 'rpc' method. Assuming an 'exec_sql' or similar function exists from previous setup.
    # If not, we might need to rely on the user running it or use a specific tool.
    # Wait, I see 'run_migration.py' in the file list. Let's look at that first.
    pass
except Exception as e:
    print(e)
