import asyncio
import os
import re
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def check_history_logic(material_id: int):
    print(f"--- Checking Material {material_id} ---")
    
    # 1. Fetch raw movements
    response = supabase.table("inventory_movements")\
        .select("*")\
        .eq("material_id", material_id)\
        .eq("movement_type", "IN")\
        .order("timestamp", desc=True)\
        .limit(5)\
        .execute()
    
    movements = response.data
    print(f"Found {len(movements)} IN movements.")

    req_folios = []

    # 2. Simulate materials.py logic
    for m in movements:
        print(f"\nID: {m['id']}")
        print(f"  Ref Type: {m.get('reference_type')}")
        print(f"  Ref ID: {m.get('reference_id')}")
        print(f"  Notes: {m.get('notes')}")
        
        # Logic from materials.py
        if m.get('reference_type') == 'REQUISITION':
             if m.get('reference_id'):
                 req_folios.append(m.get('reference_id'))
        # Parsing Logic
        if m.get('notes'):
             match = re.search(r'REQ-\d{4}-(\d+)', m.get('notes') or '')
             if match:
                 folio = int(match.group(1))
                 m['fetched_folio'] = folio
                 print(f"  [PARSED] Folio found in notes: {folio}")
                 req_folios.append(folio)
             else:
                 print("  [PARSED] No folio found in notes via regex.")

    req_folios = list(set(req_folios))
    print(f"\nFolios to fetch: {req_folios}")

    if req_folios:
        reqs_res = supabase.table('requisitions')\
             .select('id, folio, requester:profiles!requester_id(full_name)')\
             .in_('folio', req_folios)\
             .execute()
        print(f"Requisitions found in DB: {reqs_res.data}")
    else:
        print("No requisitions to fetch.")

if __name__ == "__main__":
    asyncio.run(check_history_logic(2))
