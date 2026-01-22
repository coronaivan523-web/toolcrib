
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException
from app.core.supabase import supabase_admin
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

class CycleCountService:
    @staticmethod
    def _enrich_with_profiles(sessions: List[dict]):
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
             res = supabase_admin.table('profiles').select('id, full_name, email, role').in_('id', ids).execute()
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
    def get_sessions():
        # Fetch sessions with lines for status/date computation
        res = supabase_admin.table('cycle_count_sessions').select('*, lines:cycle_count_lines(count_date, qty_physical, qty_system)').order('created_at', desc=True).execute()
        return CycleCountService._enrich_with_profiles(res.data)

    @staticmethod
    def get_active_lines():
        # Fetch ALL lines from active sessions
        # Safe 2-level join: Get material name AND session assigned_to (ID only)
        # We rely on frontend to map ID -> Name using its cached user list. Safe from 3-level join crashes.
        query = '*, material:materials(name), session:cycle_count_sessions(assigned_to, planned_date)'
        
        # Order by created_at (counted_at) desc to show latest added first - Changed from count_date which can be null
        res = supabase_admin.table('cycle_count_lines').select(query).is_('qty_physical', 'null').order('counted_at', desc=True).execute()
        # We could enrich here too but active lines list usually doesn't show user name in same way
        return res.data

    @staticmethod
    def get_session_by_id(id: UUID):
        # Fetch session - Removed Join
        session_res = supabase_admin.table('cycle_count_sessions').select('*').eq('id', str(id)).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_res.data
        
        # Fetch lines with material details (Materials join is fine as it uses BIGINT FK which is standard)
        # Removed Profile join
        lines_res = supabase_admin.table('cycle_count_lines').select(
            '*, material:materials(*), location:locations(code)' 
        ).eq('session_id', str(id)).execute()
        
        session['lines'] = lines_res.data
        
        # Enrich single session
        enriched = CycleCountService._enrich_with_profiles([session])
        return enriched[0]

    @staticmethod
    def log_debug(msg):
        try:
            with open("debug_cycle_crash.log", "a", encoding="utf-8") as f:
                f.write(f"{msg}\n")
        except:
            pass

    @staticmethod
    def create_session(data: CycleCountSessionCreate, user_id: str):
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
            existing_res = supabase_admin.table('cycle_count_sessions').select('ticket_id').execute()
            
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
            res = supabase_admin.table('cycle_count_sessions').insert(payload).execute()
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
    def add_line(session_id: UUID, data: CycleCountLineCreate, user_id: str):
        # 1. Fetch system stock
        mat_res = supabase_admin.table('materials').select('current_stock').eq('id', data.material_id).single().execute()
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
        res = supabase_admin.table('cycle_count_lines').insert(payload).execute()
        if not res.data:
             raise HTTPException(status_code=500, detail="Insert line failed")
             
        # DEFERRED: Stock update moved to commit_session
        # if payload.get('qty_physical') is not None:
        #    supabase_admin.table('materials').update({'current_stock': payload['qty_physical']}).eq('id', data.material_id).execute()
        
        return res.data[0]

    @staticmethod
    def update_session(id: UUID, data: dict):
        res = supabase_admin.table('cycle_count_sessions').update(data).eq('id', str(id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found or update failed")
        return res.data[0]

    @staticmethod
    def update_line(line_id: UUID, data: dict):
        # Prevent updating critical fields if needed, but for now allow all passed in data
        res = supabase_admin.table('cycle_count_lines').update(data).eq('id', str(line_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Line not found or update failed")
        
        # DEFERRED: Stock update moved to commit_session
        # if 'qty_physical' in data and data['qty_physical'] is not None:
        #      line = res.data[0]
        #      supabase_admin.table('materials').update({'current_stock': data['qty_physical']}).eq('id', line['material_id']).execute()
             
        return res.data[0]

    @staticmethod
    def commit_session(session_id: UUID, user_id: str):
        """
        Finalizes the session:
        1. Iterates all lines with a physical count.
        2. Calculates delta vs system stock.
        3. Records movement in inventory_movements.
        4. Updates materials.current_stock.
        5. Sets session status to CLOSED.
        """
        # 1. Fetch lines
        session_res = supabase_admin.table('cycle_count_sessions').select('*, lines:cycle_count_lines(*)').eq('id', str(session_id)).single().execute()
        if not session_res.data:
             raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_res.data
        lines = session.get('lines', [])
        
        for line in lines:
            # Skip if no physical count was ever entered
            if line.get('qty_physical') is None:
                continue

            material_id = line['material_id']
            qty_physical = line['qty_physical']
            
            # Fetch current live stock for accurate ledger
            mat_res = supabase_admin.table('materials').select('current_stock').eq('id', material_id).single().execute()
            current_live_stock = mat_res.data['current_stock'] if mat_res.data and mat_res.data.get('current_stock') is not None else 0
            
            # Calculate delta based on forcing the stock to be qty_physical
            delta = qty_physical - current_live_stock
            
            if delta != 0:
                # Record Movement
                movement_payload = {
                    "material_id": material_id,
                    "quantity_change": delta,
                    "new_stock_level": qty_physical,
                    "previous_stock_level": current_live_stock,
                    "movement_type": "CYCLE_COUNT",
                    "reference_id": str(session_id),
                    "reason": f"Cycle Count Adjustment (Session {session.get('ticket_id')})",
                    "created_by": user_id
                }
                supabase_admin.table('inventory_movements').insert(movement_payload).execute()
                
                # Update Material
                supabase_admin.table('materials').update({'current_stock': qty_physical}).eq('id', material_id).execute()
        
        # 2. Close Session
        supabase_admin.table('cycle_count_sessions').update({'status': 'CLOSED'}).eq('id', str(session_id)).execute()
        
        return {"status": "success", "message": "Session committed and inventory updated"}
