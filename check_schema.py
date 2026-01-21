from app.core.supabase import supabase_admin
import json

try:
    # Fetch one row to see keys/structure
    res = supabase_admin.table('inventory_movements').select('*').limit(1).execute()
    if res.data:
        print("Keys present:", list(res.data[0].keys()))
    else:
        print("No rows found. Cannot determine complete schema easily via select, but will try insert dry-run or similar if needed.")
except Exception as e:
    print(e)
