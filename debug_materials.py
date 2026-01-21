
import os
import sys
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin, supabase

def check_mats():
    client = supabase_admin if supabase_admin else supabase
    try:
        # Limit to 5
        res = client.table('materials').select('*').limit(5).execute()
        print(f"Total Materials (limit 5 check): {len(res.data)}")
        for m in res.data:
            print(f"  - {m.get('part_number')} | {m.get('description')} | Stock: {m.get('current_stock')}")
    except Exception as e:
        print(f"Error checking materials: {e}")

if __name__ == "__main__":
    check_mats()
