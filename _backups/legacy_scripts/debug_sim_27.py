import os
from supabase import create_client, Client

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception as e:
    print(f"Warning: Could not read .env: {e}")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars.")
    exit(1)

supabase: Client = create_client(url, key)

print("\n--- SIMULATING ENRICHMENT FOR MOVEMENT 27 ---")
try:
    # 2. Get Movements (Emulating fetch of specific movement)
    moves_response = supabase.table("inventory_movements")\
        .select("*")\
        .eq("id", 27)\
        .execute()
    movements = moves_response.data if moves_response.data else []
    
    if not movements:
        print("Movement 27 not found.")
        exit()

    print(f"Movement Found: {movements[0]['notes']}")

    # 5. Enrich REQUISITION movements (Logic copiada de materials.py)
    req_folios = []
    for m in movements:
        if m.get('reference_type') == 'REQUISITION':
             if m.get('reference_id'):
                 req_folios.append(m.get('reference_id'))
             elif m.get('notes'):
                 # Try to parse 'Incoming from Requisition REQ-YYYY-FOLIO'
                 try:
                     import re
                     match = re.search(r'REQ-\d{4}-(\d+)', m.get('notes') or '')
                     if match:
                         folio = int(match.group(1))
                         m['fetched_folio'] = folio # Store for later map lookup
                         print(f"[DEBUG] Parsed Folio from Note: {folio}")
                         req_folios.append(folio)
                     else:
                         print("[DEBUG] No match found in regex")
                 except Exception as e:
                     print(f"[DEBUG] Parse Error: {e}")
                     pass

    req_folios = list(set(req_folios))
    print(f"[DEBUG] Req Folios to Fetch: {req_folios}")
    
    if req_folios:
        # 5a. Fetch Requisitions
        reqs_res = supabase.table('requisitions')\
             .select('id, folio, requester:profiles!requester_id(full_name, department, job_title)')\
             .in_('folio', req_folios)\
             .execute()
        
        print(f"[DEBUG] Reqs Fetched Check: {len(reqs_res.data) if reqs_res.data else 0}")
        reqs_map = {r['folio']: r for r in reqs_res.data} if reqs_res.data else {}
        req_ids = [r['id'] for r in reqs_map.values()]

        # 5b. Fetch Items (for Cost Center)
        if req_ids:
            # Note: Need material_id to filter correct item if multiple items in req,
            # but here we fetch for specific movement's material.
            # In materials.py 'id' variable is the material_id context.
            # Assuming material_id=2 for this test
            material_id = 2 
            
            items_res = supabase.table('requisition_items')\
                .select('requisition_id, cost_center, project_code')\
                .in_('requisition_id', req_ids)\
                .eq('material_id', material_id)\
                .execute()
            
            items_map = {i['requisition_id']: i for i in items_res.data} if items_res.data else {}
        else:
            items_map = {}

        # 5c. Attach Data
        for m in movements:
            if m.get('reference_type') == 'REQUISITION':
                folio = m.get('reference_id') or m.get('fetched_folio')
                if folio and folio in reqs_map:
                     req = reqs_map[folio]
                     # Requester
                     profile = req.get('requester')
                     print(f"[DEBUG] Profile found: {profile}")
                     
                     if profile:
                         m['requester_name'] = profile.get('full_name', 'Unknown')
                         m['area'] = profile.get('department') # Map Department -> Area
                     
                     # Cost Center -> Plant, Project Code -> Process
                     item = items_map.get(req['id'])
                     print(f"[DEBUG] Item found: {item}")

                     if item:
                         m['plant'] = item.get('cost_center')
                         m['process'] = item.get('project_code') # Map Project Code -> Process
    
    # Check results
    m = movements[0]
    print("\n--- FINAL ENRICHED DATA ---")
    print(f"Requester Name: {m.get('requester_name')}")
    print(f"Area: {m.get('area')}")
    print(f"Plant: {m.get('plant')}")
    print(f"Process: {m.get('process')}")


except Exception as e:
    print(f"Error: {e}")
