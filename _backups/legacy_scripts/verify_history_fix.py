
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
try:
    from app.core.config import settings
except:
    os.environ['SUPABASE_URL'] = 'https://bykumuizmxsclsazeych.supabase.co'
    # Use the keys we saw in .env if needed, but imports should work if env vars set
    pass

def verify_fix():
    print("--- Verifying History API Fix ---")
    # 1. Setup Client
    url = os.getenv("SUPABASE_URL") or settings.SUPABASE_URL
    key = os.getenv("SUPABASE_SERVICE_KEY") or settings.SUPABASE_SERVICE_KEY
    supabase = create_client(url, key)
    
    # 2. Get Material 9 (Eje-001 from screenshot?)
    # Or just search Eje-001
    mat = supabase.table('materials').select('id').eq('part_number', 'Eje-001').single().execute()
    if not mat.data:
        print("Material Eje-001 not found, trying ID 9 directly")
        mat_id = 9
    else:
        mat_id = mat.data['id']
        
    print(f"Testing Material ID: {mat_id}")
    
    # 3. Get History Logic (Simulated from materials.py)
    movements_res = supabase.table('inventory_movements').select('*').eq('material_id', mat_id).order('timestamp', desc=True).limit(5).execute()
    movements = movements_res.data
    
    print(f"Found {len(movements)} movements.")
    
    # 4. Apply The Fix Logic
    # Old Broken Logic: user_ids = [m.get('user_id') ...]
    # New Logic: user_ids = [m.get('created_by') ...]
    
    user_ids = list(set([m.get('created_by') for m in movements if m.get('created_by')]))
    print(f"User IDs found (via created_by): {user_ids}")
    
    if user_ids:
        users_res = supabase.table('profiles').select('id, full_name').in_('id', user_ids).execute()
        users_map = {u['id']: u for u in users_res.data}
        
        for m in movements:
            uid = m.get('created_by')
            user_info = users_map.get(uid, {'full_name': 'Unknown'})
            print(f"Movement {m['id']} -> User: {user_info['full_name']} (ID: {uid})")
            
            # Check stock columns too
            print(f"   Stock: Prev={m.get('previous_stock_level')}, New={m.get('new_stock_level')}, QtyChange={m.get('quantity_change')}")
    else:
        print("No user IDs found in movements.")

if __name__ == "__main__":
    verify_fix()
