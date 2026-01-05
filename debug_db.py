import os
import asyncio
from supabase import create_client, Client

# Hardcoded credentials from what I can assume or I should check .env.
# Since I can't read .env easily in python script without dotenv, I will try to read it from the file first or use the provided client if available.
# Actually I will use the frontend .env logic.
# Let's try to read key from frontend/.env if possible.

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

# Wait, I don't have env vars set in this shell context unless I read them.
# I'll rely on the `run_command` to set them or I will read the .env file in python.

def read_env_file(filepath):
    env_vars = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return env_vars

env = read_env_file(r'c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\.env.local')
# Fallback to .env if needed
if not env:
    env = read_env_file(r'c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\.env')
if not env.get('SUPABASE_SERVICE_KEY'):
    # Try root .env
    root_env = read_env_file(r'c:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\.env')
    env.update(root_env)

SUBAPSE_URL = env.get('VITE_SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_KEY') or env.get('VITE_SUPABASE_SERVICE_KEY')
ANON_KEY = env.get('VITE_SUPABASE_ANON_KEY')

# Credentials
USER_EMAIL = "ivan.corona@wasion.cn"
USER_PASS = "Wasion2024!"

if not SUBAPSE_URL:
    print("Missing SUPABASE_URL")
    exit()

if SUPABASE_KEY:
    print("Using SERVICE KEY (Bypassing RLS)")
    supabase: Client = create_client(SUBAPSE_URL, SUPABASE_KEY)
else:
    print("Using ANON KEY + Login")
    supabase: Client = create_client(SUBAPSE_URL, ANON_KEY)
    try:
        res = supabase.auth.sign_in_with_password({"email": USER_EMAIL, "password": USER_PASS})
        if res.user:
            print(f"Logged in as {res.user.email}")
        else:
            print("Login failed, proceeding as anon...")
    except Exception as e:
        print(f"Login error: {e}")

def list_materials():
    print("--- Listing top 5 materials ---")
    res = supabase.table('materials').select('id, name, part_number').limit(5).execute()
    for m in res.data:
        print(m)

def debug_material_req(part_number):
    print(f"--- Debugging Material: {part_number} ---")
    
    # 1. Get Material ID (Try exact match first)
    res = supabase.table('materials').select('*').eq('part_number', part_number).execute()
    
    if not res.data:
        print(f"Exact match for {part_number} failed. Trying case-insensitive...")
        res = supabase.table('materials').select('*').ilike('part_number', part_number).execute()
        
    if not res.data:
        # Try finding by name
        res = supabase.table('materials').select('*').ilike('name', f"%{part_number}%").execute()

    if not res.data:
        print(f"Material {part_number} not found.")
        return
    
    for material in res.data:
        mat_id = material['id']
        print(f"Material Found: ID: {mat_id} | Name: {material['name']} | Part: {material['part_number']}")

        # 2. Get Requisition Items
        res_items = supabase.table('requisition_items').select('*').eq('material_id', mat_id).execute()
        print(f"Found {len(res_items.data)} requisition items.")

        if not res_items.data:
            print("No requisition_items found for this material.")
            continue

        req_ids = [item['requisition_id'] for item in res_items.data]
        print(f"Requisition IDs found: {req_ids}")

        # 3. Get Requisitions
        if req_ids:
            res_reqs = supabase.table('requisitions').select('*').in_('id', req_ids).execute()
            print(f"Found {len(res_reqs.data)} requisitions.")
            for r in res_reqs.data:
                print(f" - Req #{r.get('folio', 'N/A')} | ID: {r['id']} | Status: {r['status']} | Created: {r['created_at']}")

list_materials()
debug_material_req('Pru-004')
debug_material_req('Prueba')
