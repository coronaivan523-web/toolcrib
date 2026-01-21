
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException
from app.core.supabase import supabase_admin
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

class CycleCountService:
    @staticmethod
    def get_sessions():
        # Fetch sessions with lines for status/date computation
        res = supabase_admin.table('cycle_count_sessions').select('*, lines:cycle_count_lines(count_date, qty_physical)').order('created_at', desc=True).execute()
        return res.data

    @staticmethod
    def get_active_lines():
        # Fetch ALL lines from active sessions
        # Safe 2-level join: Get material name AND session assigned_to (ID only)
        # We rely on frontend to map ID -> Name using its cached user list. Safe from 3-level join crashes.
        query = '*, material:materials(name), session:cycle_count_sessions(assigned_to, planned_date)'
        
        # Order by created_at (counted_at) desc to show latest added first - Changed from count_date which can be null
        res = supabase_admin.table('cycle_count_lines').select(query).is_('qty_physical', 'null').order('counted_at', desc=True).execute()
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
        return session

    @staticmethod
    def create_session(data: CycleCountSessionCreate, user_id: str):
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
        # This is a bit manual since we don't have a direct sequence
        try:
            # Fetch all ticket_ids starting with prefix
            # Note: This might be slow with thousands of records, but fine for now. 
            # Ideally use a separate sequence table or SQL function.
            existing_res = supabase_admin.table('cycle_count_sessions').select('ticket_id').ilike('ticket_id', f'{prefix}%').execute()
            
            max_seq = 0
            for row in existing_res.data:
                tid = row.get('ticket_id')
                if tid:
                    parts = tid.split('-')
                    if len(parts) == 2 and parts[1].isdigit():
                        seq = int(parts[1])
                        if seq > max_seq:
                            max_seq = seq
            
            next_seq = max_seq + 1
            new_ticket_id = f"{prefix}{next_seq:05d}"
            payload['ticket_id'] = new_ticket_id
            
        except Exception as e:
            print(f"Error generating ticket_id: {e}")
            # Fallback (nullable) or just continue without it
            pass

        # Insert
        res = supabase_admin.table('cycle_count_sessions').insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create session")
        return res.data[0]

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
             
        if payload.get('qty_physical') is not None:
            # Update material stock immediately only if we have a count
            supabase_admin.table('materials').update({'current_stock': payload['qty_physical']}).eq('id', data.material_id).execute()
        
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
        
        # Real-time Stock Update (Simplified) - If qty_physical is updated
        if 'qty_physical' in data and data['qty_physical'] is not None:
             # Need material_id. Fetch line first or return it.
             line = res.data[0]
             supabase_admin.table('materials').update({'current_stock': data['qty_physical']}).eq('id', line['material_id']).execute()
             
        return res.data[0]
