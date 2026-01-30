import os
import json
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars")
    exit(1)

supabase: Client = create_client(url, key)

def get_history(material_id):
    print(f"Fetching history for {material_id}")
    
    # 2. Get Movements
    moves_response = supabase.table("inventory_movements")\
        .select("*")\
        .eq("material_id", material_id)\
        .eq("reference_type", "REQUISITION")\
        .order("timestamp", desc=True)\
        .limit(5)\
        .execute()
        
    movements = moves_response.data if moves_response.data else []
    if not movements:
        print("No REQUISITION movements found for this material.")
        return

    # 5. Enrich REQUISITION movements
    req_folios = []
    for m in movements:
        if m.get('reference_type') == 'REQUISITION':
                if m.get('reference_id'):
                    req_folios.append(m.get('reference_id'))
                elif m.get('notes'):
                    try:
                        match = re.search(r'REQ-\d{4}-(\d+)', m.get('notes') or '')
                        if match:
                            folio = int(match.group(1))
                            m['fetched_folio'] = folio 
                            req_folios.append(folio)
                    except Exception as e:
                        pass

    req_folios = list(set(req_folios))
    print(f"Folios to fetch: {req_folios}")

    if req_folios:
        reqs_res = supabase.table('requisitions')\
                .select('id, folio')\
                .in_('folio', req_folios)\
                .execute()
        
        reqs_map = {r['folio']: r for r in reqs_res.data} if reqs_res.data else {}
        print("Reqs Map keys:", reqs_map.keys())

        for m in movements:
            if m.get('reference_type') == 'REQUISITION':
                raw_folio = m.get('reference_id') or m.get('fetched_folio')
                folio = None
                try:
                    if raw_folio:
                        folio = int(raw_folio)
                except:
                    folio = raw_folio

                print(f"Movement {m['id']} has folio {folio} (raw: {raw_folio})")

                if folio and folio in reqs_map:
                        req = reqs_map[folio]
                        m['requisition_id'] = req['id']
                        print(f" -> Assigned requisition_id: {m['requisition_id']}")
                else:
                        print(f" -> FAILED to find req for folio {folio}")
                        m['requisition_id'] = None

    return movements

# Find a material with REQUISITION movement
print("Searching for material with REQUISITION movements...")
res = supabase.table("inventory_movements").select("material_id").eq("reference_type", "REQUISITION").limit(1).execute()

if res.data:
    mat_id = res.data[0]['material_id']
    print(f"Found material {mat_id}")
    get_history(mat_id)
else:
    print("No movements found to test.")
