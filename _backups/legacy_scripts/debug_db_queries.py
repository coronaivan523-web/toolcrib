
import sys
import os
import asyncio

# Add project root to path
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin

async def test_endpoints():
    print("--- TESTING DB CONNECTION ---")
    try:
        res = supabase_admin.table('profiles').select('count', count='exact').limit(1).execute()
        print(f"DB Connection OK. Profiles count: {res.count}")
    except Exception as e:
        print(f"DB Connection FAILED: {e}")
        return

    print("\n--- TESTING get_active_lines ---")
    try:
        query = '*, material:materials(name), session:cycle_count_sessions(assigned_to, planned_date)'
        print(f"Executing query on cycle_count_lines: {query}")
        res = supabase_admin.table('cycle_count_lines').select(query).is_('qty_physical', 'null').order('counted_at', desc=True).execute()
        print(f"SUCCESS. Retrieved {len(res.data)} records")
        if len(res.data) > 0:
            print(f"Sample record: {res.data[0]}")
    except Exception as e:
        print(f"FAILED get_active_lines: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- TESTING get_material_catalog ---")
    try:
        print("Executing catalog query on materials")
        res = supabase_admin.table('materials').select(
            'id, part_number, name, plant, location, process, area, machine_asset, current_stock, min_stock'
        ).limit(5000).order('part_number').execute()
        print(f"SUCCESS. Retrieved {len(res.data)} records")
    except Exception as e:
        print(f"FAILED get_material_catalog: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_endpoints())
