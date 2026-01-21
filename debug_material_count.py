
import os
import sys
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin, supabase

def count_mats():
    client = supabase_admin if supabase_admin else supabase
    try:
        # Get count
        res = client.table('materials').select('*', count='exact', head=True).execute()
        print(f"Total Materials in DB: {res.count}")
        
        # Get first 20 to see what's there
        res = client.table('materials').select('*').limit(20).execute()
        print(f"Sample of data ({len(res.data)}):")
        for m in res.data:
            print(f" - {m.get('part_number')} (ID: {m.get('id')})")
            
    except Exception as e:
        print(f"Error checking materials: {e}")

if __name__ == "__main__":
    count_mats()
