
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException
from app.core.supabase import supabase_admin
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

class CycleCountService:
    @staticmethod
    def get_sessions():
        # Removed profile join temporarily to fix PGRST200
        res = supabase_admin.table('cycle_count_sessions').select('*').order('created_at', desc=True).execute()
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
        payload['status'] = 'DRAFT'
        
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
        
        # Force INT
        qty_system = int(mat_res.data.get('current_stock', 0))

        payload = data.dict()
        payload['session_id'] = str(session_id)
        payload['counted_by'] = user_id
        payload['qty_system'] = qty_system
        payload['qty_physical'] = int(payload['qty_physical']) # Double ensure casting
        
        # Insert
        res = supabase_admin.table('cycle_count_lines').insert(payload).execute()
        if not res.data:
             raise HTTPException(status_code=500, detail="Insert line failed")
             
        # Real-time Update Logic (Simplified)
        # Update material stock immediately
        supabase_admin.table('materials').update({'current_stock': payload['qty_physical']}).eq('id', data.material_id).execute()
        
        return res.data[0]

    @staticmethod
    def update_session(id: UUID, data: dict):
        res = supabase_admin.table('cycle_count_sessions').update(data).eq('id', str(id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found or update failed")
        return res.data[0]
