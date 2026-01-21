import asyncio
from app.core.supabase import supabase_admin
import json

async def test_history():
    print("--- DEBUGGING MATERIAL HISTORY ---")
    
    # 1. Find the material
    print("Searching for TEST-SKU-001...")
    res = supabase_admin.table('materials').select('*').eq('part_number', 'TEST-SKU-001').execute()
    if not res.data:
        print("Material not found!")
        return
    
    material = res.data[0]
    mat_id = material['id']
    print(f"Material Found: ID={mat_id}, Name={material['name']}")

    # 2. Fetch Movements (mimicking materials.py)
    print(f"Fetching last 10 movements for Material {mat_id}...")
    moves_response = supabase_admin.table("inventory_movements")\
        .select("*")\
        .eq("material_id", mat_id)\
        .order("timestamp", desc=True)\
        .limit(10)\
        .execute()
        
    movements = moves_response.data if moves_response.data else []
    print(f"Found {len(movements)} movements.")

    # 3. Simulate Enrichment Logic for REQUISITIONS
    req_folios = []
    for m in movements:
        if m.get('reference_type') == 'REQUISITION':
                if m.get('reference_id'):
                    req_folios.append(m.get('reference_id'))
    
    req_folios = list(set(req_folios))
    print(f"Req Folios found in movements: {req_folios}")

    if req_folios:
        reqs_res = supabase_admin.table('requisitions')\
                .select('id, folio, requester:profiles!requester_id(full_name, department)')\
                .in_('folio', req_folios)\
                .execute()
        
        reqs_map = {r['folio']: r for r in reqs_res.data} if reqs_res.data else {}
        print(f"Requisitions fetched from DB: {list(reqs_map.keys())}")
        
        for m in movements:
            if m.get('reference_type') == 'REQUISITION':
                folio = m.get('reference_id')
                print(f"Checking movement with Folio Ref: {folio}")
                if folio and folio in reqs_map:
                    req = reqs_map[folio]
                    print(f" -> MATCH! Requisition ID (UUID): {req.get('id')}")
                    m['requisition_id'] = req['id']
                else:
                    print(f" -> NO MATCH for Folio {folio}")

    # Output one example
    for m in movements:
        if m.get('reference_type') == 'REQUISITION':
            print("\n--- Example Enrichment Result ---")
            print(json.dumps(m, indent=2, default=str))
            break

if __name__ == "__main__":
    asyncio.run(test_history())
