import asyncio
import os
from app.core.supabase import supabase_admin

# Mock environment if needed
# os.environ["SUPABASE_URL"] = ... 

async def test_history():
    print("--- DEBUGGING MATERIAL 2 ---")
    id = 2
    
    # Get Movements
    moves_response = supabase_admin.table("inventory_movements")\
        .select("*")\
        .eq("material_id", id)\
        .order("timestamp", desc=True)\
        .limit(10)\
        .execute()
        
    movements = moves_response.data if moves_response.data else []
    
    for m in movements:
        print(f"ID: {m.get('id')} | Type: {m.get('movement_type')} | RefType: {m.get('reference_type')} | RefID: {m.get('reference_id')} | Notes: {m.get('notes')}")
        
        # Test my logic locally
        fetched_folio = None
        if m.get('notes'):
             import re
             match = re.search(r'REQ-\d{4}-(\d+)', m.get('notes') or '')
             if match:
                 fetched_folio = int(match.group(1))
                 print(f"   -> Parsed Folio: {fetched_folio}")
        
        if m.get('reference_type') == 'REQUISITION':
            print("   -> IS REQUISITION TYPE")
        else:
            print("   -> NOT REQUISITION TYPE (Logic skips enrichment!)")

if __name__ == "__main__":
    asyncio.run(test_history())
