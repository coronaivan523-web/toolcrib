
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException
from supabase import Client
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

class CycleCountService:
    @staticmethod
    def _enrich_with_profiles(sessions: List[dict], client: Client):
        user_ids = set()
        for s in sessions:
            if s.get('created_by'): user_ids.add(str(s['created_by']))
            if s.get('assigned_to'): user_ids.add(str(s['assigned_to']))
            if 'lines' in s:
                for l in s['lines']:
                     if l.get('counted_by'): user_ids.add(str(l['counted_by']))

        if not user_ids:
            return sessions

        ids = list(user_ids)
        try:
             res = client.table('profiles').select('id, full_name, email, role').in_('id', ids).execute()
             profile_map = { p['id']: p for p in res.data }
             
             for s in sessions:
                 if s.get('created_by') and str(s['created_by']) in profile_map:
                     s['created_by_profile'] = profile_map[str(s['created_by'])]
                 if s.get('assigned_to') and str(s['assigned_to']) in profile_map:
                     s['assigned_to_profile'] = profile_map[str(s['assigned_to'])]
                 
                 if 'lines' in s:
                     for l in s['lines']:
                         if l.get('counted_by') and str(l['counted_by']) in profile_map:
                             l['counted_by_profile'] = profile_map[str(l['counted_by'])]

        except Exception as e:
            print(f"Error enriching profiles: {e}")
            
        return sessions

    @staticmethod
    def get_sessions(client: Client):
        # Fetch sessions with lines for status/date computation
        res = client.table('cycle_count_sessions').select('*, lines:cycle_count_lines(count_date, qty_physical, qty_system)').order('created_at', desc=True).execute()
        return CycleCountService._enrich_with_profiles(res.data, client)

    @staticmethod
    def get_active_lines(client: Client):
        # Fetch ALL lines from active sessions
        # Safe 2-level join: Get material name AND session assigned_to (ID only)
        # We rely on frontend to map ID -> Name using its cached user list. Safe from 3-level join crashes.
        query = '*, material:materials(name), session:cycle_count_sessions(assigned_to, planned_date)'
        
        # Order by created_at (counted_at) desc to show latest added first
        # Show ALL statuses (PENDING, VALIDATED) so users can see completed work in the grid
        # Limit to last 200 to enforce performance (Historical data should be in a separate report)
        # FILTER: Exclude ARCHIVED lines (Reset status)
        res = client.table('cycle_count_lines').select(query)\
            .neq('status', 'ARCHIVED')\
            .order('counted_at', desc=True)\
            .limit(200)\
            .execute()
        # We could enrich here too but active lines list usually doesn't show user name in same way
        return res.data

    @staticmethod
    def get_session_by_id(id: UUID, client: Client):
        # Fetch session - Removed Join
        session_res = client.table('cycle_count_sessions').select('*').eq('id', str(id)).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_res.data
        
        # Fetch lines with material details (Materials join is fine as it uses BIGINT FK which is standard)
        # Removed Profile join
        lines_res = client.table('cycle_count_lines').select(
            '*, material:materials(*), location:locations(code)' 
        ).eq('session_id', str(id)).execute()
        
        session['lines'] = lines_res.data
        
        # Enrich single session
        enriched = CycleCountService._enrich_with_profiles([session], client)
        return enriched[0]

    @staticmethod
    def log_debug(msg):
        try:
            with open("debug_cycle_crash.log", "a", encoding="utf-8") as f:
                f.write(f"{msg}\n")
        except:
            pass

    @staticmethod
    def create_session(data: CycleCountSessionCreate, user_id: str, client: Client):
        CycleCountService.log_debug(f"START create_session. User: {user_id}")
        payload = data.dict()
        payload['created_by'] = user_id
        payload['status'] = 'PENDING'
        
        # FIX: Convert UUIDs to strings for JSON serialization
        for key, value in payload.items():
            if isinstance(value, UUID):
                payload[key] = str(value)
        
        # --- Generate Sequential ID (C{YEAR}-{SEQ}) ---
        import datetime
        current_year = datetime.datetime.now().year
        prefix = f"C{current_year}-"
        
        # Find max existing ID for this year
        max_seq = 0
        try:
            # Fetch all ticket_ids starting with prefix
            CycleCountService.log_debug(f"Fetching tickets with prefix: {prefix}")
            existing_res = client.table('cycle_count_sessions').select('ticket_id').execute()
            
            CycleCountService.log_debug(f"Found {len(existing_res.data)} sessions")
            
            for row in existing_res.data:
                tid = row.get('ticket_id')
                if tid and tid.startswith(prefix):
                    parts = tid.split('-')
                    if len(parts) == 2 and parts[1].isdigit():
                        seq = int(parts[1])
                        if seq > max_seq:
                            max_seq = seq
            
            CycleCountService.log_debug(f"Max seq: {max_seq}")
            next_seq = max_seq + 1
            new_ticket_id = f"{prefix}{next_seq:06d}"  # 6 dígitos: 000001
            payload['ticket_id'] = new_ticket_id
            CycleCountService.log_debug(f"Generated ID: {new_ticket_id}")
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            CycleCountService.log_debug(f"ERROR in logic: {e}\n{tb}")
            
            # Fallback: Generate with timestamp to ensure uniqueness
            import time
            fallback_id = f"{prefix}{int(time.time()) % 1000000:06d}"
            payload['ticket_id'] = fallback_id
            CycleCountService.log_debug(f"Using fallback ID: {fallback_id}")

        # Insert
        try:
            CycleCountService.log_debug(f"Inserting payload: {payload}")
            res = client.table('cycle_count_sessions').insert(payload).execute()
            if not res.data:
                raise HTTPException(status_code=500, detail="Failed to create session")
            CycleCountService.log_debug("Insert SUCCESS")
            return res.data[0]
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            CycleCountService.log_debug(f"ERROR in Insert: {e}\n{tb}")
            raise e

    @staticmethod
    def add_line(session_id: UUID, data: CycleCountLineCreate, user_id: str, client: Client):
        # 1. Fetch system stock
        mat_res = client.table('materials').select('current_stock').eq('id', data.material_id).single().execute()
        if not mat_res.data:
            raise HTTPException(status_code=404, detail="Material not found")
        
        # Force INT (Handle None)
        current_stock = mat_res.data.get('current_stock')
        qty_system = int(current_stock) if current_stock is not None else 0

        payload = data.dict()
        payload['session_id'] = str(session_id)
        payload['qty_system'] = qty_system
        
        # Handle optional physical count
        # FIX: Only set 'counted_by' if we actually have a physical count (Real execution)
        # If adding a planned line (qty_physical is None), counted_by must be None.
        if payload.get('qty_physical') is not None:
            payload['qty_physical'] = int(payload['qty_physical'])
            payload['counted_by'] = user_id 
        else:
            payload['qty_physical'] = None
            payload['counted_by'] = None
        
        # FIX: Convert UUIDs to strings for JSON serialization
        for key, value in payload.items():
            if isinstance(value, UUID):
                payload[key] = str(value)

        # Insert
        res = client.table('cycle_count_lines').insert(payload).execute()
        if not res.data:
             raise HTTPException(status_code=500, detail="Insert line failed")
        
        return res.data[0]

    @staticmethod
    def update_session(id: UUID, data: dict, client: Client):
        res = client.table('cycle_count_sessions').update(data).eq('id', str(id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found or update failed")
        return res.data[0]

    @staticmethod
    def update_line(line_id: UUID, data: dict, client: Client):
        # Prevent updating critical fields if needed, but for now allow all passed in data
        res = client.table('cycle_count_lines').update(data).eq('id', str(line_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Line not found or update failed")
             
        return res.data[0]

    # Old commit_line removed to avoid duplication

    @staticmethod
    def commit_line(line_id: UUID, user_id: str, client: Client):
        """
        Commit a single line adjustment (Supervisor Action).
        """
        # 1. Fetch Line AND Session Info (to get assigned_to)
        # We need to attribute the count to the ASSIGNED user (e.g. Laura), 
        # not necessarily the current user (e.g. Admin Ivan) who clicks the button.
        line_res = client.table('cycle_count_lines').select(
            '*, session:cycle_count_sessions(assigned_to)'
        ).eq('id', str(line_id)).single().execute()
        
        if not line_res.data:
            raise HTTPException(status_code=404, detail="Line not found")
        
        line = line_res.data
        if line.get('qty_physical') is None:
             raise HTTPException(status_code=400, detail="Cannot commit line without physical quantity")

        # Determine the "Performer" User
        # Default to current logged-in user
        performer_id = user_id
        
        # Override with Session Assigned User if available
        # This ensures history shows "Laura" even if "Ivan" enters data
        if line.get('session') and line['session'].get('assigned_to'):
            performer_id = line['session']['assigned_to']
            CycleCountService.log_debug(f"Override User: Current={user_id} -> Assigned={performer_id}")

        material_id = line['material_id']
        qty_physical = line['qty_physical']
        
        # 2. Fetch Current Stock
        mat_res = client.table('materials').select('current_stock').eq('id', material_id).single().execute()
        current_live_stock = mat_res.data['current_stock'] if mat_res.data and mat_res.data.get('current_stock') is not None else 0
        
        # --- HC-2 ATOMIC UPDATE VIA RPC ---
        reason_str = f"Cycle Count Adjustment ({delta}) [RefLine:{line_id}]"
        
        try:
            if delta != 0:
                result = client.rpc(
                    "atomic_inventory_movement_v1",
                    {
                        "p_material_id": material_id,
                        "p_delta": delta,
                        "p_user_id": performer_id,
                        "p_reason": reason_str
                    }
                ).execute()
        except Exception as e:
            err_msg = str(e)
            if 'Insufficient stock' in err_msg:
                 raise HTTPException(status_code=400, detail="Insufficient stock to satisfy this movement.")
            elif 'Material not found' in err_msg:
                 raise HTTPException(status_code=404, detail="Material not found")
            else:
                 CycleCountService.log_debug(f"[CRITICAL ERROR] RPC atomic_inventory_movement_v1 failed: {e}")
                 raise HTTPException(status_code=400, detail=f"Database atomic transaction rejected: {e}")

        # [DUAL-WRITE INJECTION - SHADOW MODE]
        idempotency_key = f"CYCLE:{line.get('session_id', 'unknown')}:{material_id}:{delta}:{line_id}"
        
        try:
            if delta != 0:
                client.rpc('process_ledger_movement', {
                    'p_payload': {
                        'material_id': material_id,
                        'movement_type': "ADJUSTMENT",
                        'quantity': delta,
                        'reference_type': 'CYCLE_COUNT',
                        'reference_id': str(line_id),
                        'idempotency_key': idempotency_key,
                        'created_by': performer_id,
                        'metadata': {"shadow_mode": True, "atomic_v1": True}
                    }
                }).execute()
        except Exception as e:
            CycleCountService.log_debug(f"[SHADOW MODE ERROR] ledger injection failed: {e}")

        # 5. Update Material Last Counted Timestamp
        import datetime
        now = datetime.datetime.now().isoformat()
        
        client.table('materials').update({
            'last_counted_at': now
        }).eq('id', material_id).execute()
        
        # 6. Update Line Status AND Correct Counted By
        # We also enforce that the line record reflects the assigned user
        client.table('cycle_count_lines').update({
            'status': 'VALIDATED',
            'counted_by': performer_id
        }).eq('id', str(line_id)).execute()
        
        return {"status": "success", "message": "Item adjusted and validated", "delta": delta}

    @staticmethod
    def commit_session(session_id: UUID, user_id: str, client: Client):
        # DEPRECATED: Kept for legacy compatibility if needed, but Workflow moved to commit_line
        pass

    @staticmethod
    def archive_lines_by_material(material_ids: List[int], user_id: str, client: Client):
        """
        Archive existing active lines for specific materials.
        This effectively "resets" their status so they can be counted again in a new session.
        """
        if not material_ids:
            return {"count": 0}
            
        # Update status to ARCHIVED for any line matching material_ids that is NOT already archived
        res = client.table('cycle_count_lines')\
            .update({'status': 'ARCHIVED'})\
            .in_('material_id', material_ids)\
            .neq('status', 'ARCHIVED')\
            .execute()
            
        return {"count": len(res.data) if res.data else 0}
