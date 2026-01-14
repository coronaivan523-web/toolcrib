from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()

@router.get("/{id}/history", response_model=Dict[str, Any])
def get_material_history(
    id: int,
    limit: int = 10,
    current_user: Any = Depends(get_current_user)
):
    """
    Get history for a specific material:
    - Current Stock
    - Total Received (All time IN)
    - Last 10 Movements
    """
    try:
        print(f"[DEBUG] Fetching history for Material ID: {id} - RELOADED VERSION CHECK")
        if not supabase_admin:
            print("[CRITICAL] supabase_admin is None")
            raise HTTPException(status_code=500, detail="Backend misconfiguration: Admin client missing.")

        # 1. Get Material Info & Stock
        # Use limit(1) which is safer across library versions than maybe_single()
        mat_response = supabase_admin.table("materials").select("*").eq("id", id).limit(1).execute()
        
        if not mat_response.data:
            print(f"[DEBUG] Material {id} not found in DB.")
            raise HTTPException(status_code=404, detail=f"Material {id} not found")
        
        material = mat_response.data[0]
        print(f"[DEBUG] Found Material: {material.get('name')}")
        
        # 2. Get Movements History (Fetch without join first to avoid FK errors)
        moves_response = supabase_admin.table("inventory_movements")\
            .select("*")\
            .eq("material_id", id)\
            .order("timestamp", desc=True)\
            .limit(limit)\
            .execute()
            
        movements = moves_response.data if moves_response.data else []
        
        # 3. Manually fetch user details if movements exist
        if movements:
            user_ids = list(set([m.get('user_id') for m in movements if m.get('user_id')]))
            if user_ids:
                users_response = supabase_admin.table("profiles").select("id, full_name").in_("id", user_ids).execute()
                users_map = {u['id']: u for u in users_response.data} if users_response.data else {}
                
                # Attach user info
                for move in movements:
                    uid = move.get('user_id')
                    if uid in users_map:
                        move['created_by_user'] = users_map[uid]
                    else:
                        move['created_by_user'] = {'full_name': 'Unknown'}

            # 4. Enrich TICKET movements with Requester and Job Details
            ticket_folios = list(set([m.get('reference_id') for m in movements if m.get('reference_type') == 'TICKET']))
            if ticket_folios:
                # 4a. Fetch Tickets (to get Requester)
                # Note: 'folio' column is confirmed existing
                # Join with profiles to get requester name
                tickets_res = supabase_admin.table('tickets')\
                    .select('id, folio, requester:profiles!requester_id(full_name)')\
                    .in_('folio', ticket_folios)\
                    .execute()
                
                tickets_map = {t['folio']: t for t in tickets_res.data} if tickets_res.data else {}
                ticket_ids = [t['id'] for t in tickets_map.values()]

                # 4b. Fetch Ticket Items (to get Job Details for THIS material)
                if ticket_ids:
                    items_res = supabase_admin.table('ticket_items')\
                        .select('ticket_id, plant, area, line_machine, process')\
                        .in_('ticket_id', ticket_ids)\
                        .eq('material_id', id)\
                        .execute()
                        
                    items_map = {i['ticket_id']: i for i in items_res.data} if items_res.data else {}
                else:
                    items_map = {}

                # 4c. Attach Data
                for move in movements:
                    if move.get('reference_type') == 'TICKET':
                        folio = move.get('reference_id')
                        ticket = tickets_map.get(folio)
                        if ticket:
                            # Attach Requester
                            requester = ticket.get('requester', {})
                            move['requester_name'] = requester.get('full_name') if requester else 'Unknown'
                            
                            # Attach Job Details
                            item_details = items_map.get(ticket['id'])
                            if item_details:
                                move['plant'] = item_details.get('plant')
                                move['area'] = item_details.get('area')
                                move['machine'] = item_details.get('line_machine')
                                move['process'] = item_details.get('process')

            # 5. Enrich REQUISITION movements
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
                         except Exception as e:
                             print(f"[DEBUG] Parse Error: {e}")
                             pass

            req_folios = list(set(req_folios))
            print(f"[DEBUG] Req Folios to Fetch: {req_folios}")
            
            if req_folios:
                # 5a. Fetch Requisitions
                reqs_res = supabase_admin.table('requisitions')\
                     .select('id, folio, requester:profiles!requester_id(full_name, department, job_title)')\
                     .in_('folio', req_folios)\
                     .execute()
                
                print(f"[DEBUG] Reqs Fetched Check: {len(reqs_res.data) if reqs_res.data else 0}")
                reqs_map = {r['folio']: r for r in reqs_res.data} if reqs_res.data else {}
                req_ids = [r['id'] for r in reqs_map.values()]

                # 5b. Fetch Items (for Cost Center)
                if req_ids:
                    items_res = supabase_admin.table('requisition_items')\
                        .select('requisition_id, cost_center, project_code')\
                        .in_('requisition_id', req_ids)\
                        .eq('material_id', id)\
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
                             if profile:
                                 m['requester_name'] = profile.get('full_name', 'Unknown')
                                 m['area'] = profile.get('department') # Map Department -> Area
                             
                             # Cost Center -> Plant, Project Code -> Process
                             item = items_map.get(req['id'])
                             if item:
                                 m['plant'] = item.get('cost_center')
                                 m['process'] = item.get('project_code') # Map Project Code -> Process
        
        return {
            "material": material,
            "current_stock": material.get("current_stock", 0),
            "movements": movements
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error fetching material history: {e}")
        # Return generic error but log details
        raise HTTPException(status_code=500, detail=str(e))
