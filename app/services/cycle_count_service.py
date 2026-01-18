from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException
from app.core.supabase import supabase_admin
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate, CycleCountSessionUpdate

class CycleCountService:
    @staticmethod
    def get_sessions(status: Optional[str] = None):
        query = supabase_admin.table('cycle_count_sessions').select('*, created_by_profile:profiles!created_by(full_name)').order('created_at', desc=True)
        if status:
            if status == 'HISTORY':
                # Show all finished states
                query = query.in_('status', ['APPROVED', 'REJECTED', 'CANCELLED'])
            else:
                query = query.eq('status', status)
        
        response = query.execute()
        # Flatten profile name
        data = response.data
        for item in data:
            if item.get('created_by_profile'):
                item['created_by_name'] = item['created_by_profile'].get('full_name')
        return data

    @staticmethod
    def get_session_by_id(id: UUID):
        # Fetch session
        session_res = supabase_admin.table('cycle_count_sessions').select('*, created_by_profile:profiles!created_by(full_name)').eq('id', str(id)).single().execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_res.data
        if session.get('created_by_profile'):
            session['created_by_name'] = session['created_by_profile'].get('full_name')

        # Fetch lines with material details
        lines_res = supabase_admin.table('cycle_count_lines').select(
            '*, material:materials(name, part_number, current_stock), location:locations(code)'
        ).eq('session_id', str(id)).execute()
        
        lines = lines_res.data
        # Enrich lines
        for line in lines:
            if line.get('material'):
                line['material_name'] = line['material'].get('name')
                line['material_part_number'] = line['material'].get('part_number')
            if line.get('location'):
                line['location_name'] = line['location'].get('code')

        session['lines'] = lines
        return session

    @staticmethod
    def create_session(data: CycleCountSessionCreate, user_id: str):
        payload = data.dict()
        payload['created_by'] = user_id
        payload['status'] = 'DRAFT'
        
        # FIX: Convert date objects to string for JSON serialization
        if payload.get('count_date'):
            payload['count_date'] = payload['count_date'].isoformat()
        
        try:
            with open("backend_debug_manual.log", "a") as f:
                f.write(f"[DEBUG] CycleCountService.create_session payload: {payload}\n")

            res = supabase_admin.table('cycle_count_sessions').insert(payload).execute()
            
            with open("backend_debug_manual.log", "a") as f:
                f.write(f"[DEBUG] Insert Result: {res}\n")

            if not res.data:
                raise HTTPException(status_code=500, detail="Insert failed: No data returned")
            return res.data[0]
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            with open("backend_debug_manual.log", "a") as f:
                f.write(f"[ERROR] CycleCountService.create_session FAILED: {e}\n{tb}\n")
            raise HTTPException(status_code=500, detail=f"Create Session Failed: {str(e)}")

    @staticmethod
    def add_line(session_id: UUID, data: CycleCountLineCreate, user_id: str):
        # 1. Fetch current system stock for snapshot
        # WARNING: In this simplified model, we use Global Stock.
        mat_res = supabase_admin.table('materials').select('current_stock').eq('id', data.material_id).single().execute()
        if not mat_res.data:
            raise HTTPException(status_code=404, detail="Material not found")
        
        qty_system = mat_res.data.get('current_stock', 0)

        payload = data.dict()
        payload['session_id'] = str(session_id)
        payload['counted_by'] = user_id
        payload['qty_system'] = qty_system
        # Variance is computed column in DB, but good to know logic: physical - system
        
        res = supabase_admin.table('cycle_count_lines').insert(payload).execute()
        return res.data[0]
    
    @staticmethod
    def delete_line(line_id: UUID):
         supabase_admin.table('cycle_count_lines').delete().eq('id', str(line_id)).execute()
         return True

    @staticmethod
    def submit_session(session_id: UUID):
        # Check if lines exist
        lines = supabase_admin.table('cycle_count_lines').select('id').eq('session_id', str(session_id)).execute()
        if not lines.data:
            raise HTTPException(status_code=400, detail="Cannot submit empty session")
            
        res = supabase_admin.table('cycle_count_sessions').update({'status': 'SUBMITTED'}).eq('id', str(session_id)).execute()
        return res.data[0]

    @staticmethod
    def approve_session(session_id: UUID, user_id: str):
        # Transactional logic simulation
        # 1. Get lines
        lines_res = supabase_admin.table('cycle_count_lines').select('*').eq('session_id', str(session_id)).execute()
        lines = lines_res.data
        
        if not lines:
             raise HTTPException(status_code=400, detail="No lines to approve")

        # 2. Iterate and Update Inventory
        for line in lines:
            mat_id = line['material_id']
            qty_physical = line['qty_physical']
            
            # Fetch fresh stock again to be safe? Or use snapshot?
            # Standard: Use snapshot if we assume Frozen inventory, but usually we want to post adjustment to current.
            # But here `qty_physical` is the absolute truth found.
            # So `qty_after` SHOULD BE `qty_physical`.
            
            # Get current stock right now
            mat_now = supabase_admin.table('materials').select('current_stock').eq('id', mat_id).single().execute()
            current_val = mat_now.data.get('current_stock', 0)
            
            # Delta = Physical - System(Snapshot). 
            # WAIT. If stock moved since snapshot?
            # If snapshot was 10. Physical is 8. Variance -2.
            # If in the meantime 1 unit was issued. Current is 9.
            # Should we set to 8 (Absolute Truth)? Or apply delta (-2)?
            # Standard Cycle Count usually treats Physical as Absolute Truth AT THAT MOMENT.
            # If we assume no movements during count, 8 is correct.
            # If movements happen, usually we block inventory. We don't have blocking.
            # Safest approach for simple toolcrib: Apply DELTA?
            # No, user entered a Physical Count. If I count 8, I want stock to be 8.
            # But if someone took 1 while I was counting, finding 8 might mean there were 9.
            # Let's stick to simple: Set Stock = Physical Count.
            # Users should define when they count (e.g. end of shift).
            
            delta = qty_physical - current_val # Calculated against LIVE stock
            
            if delta != 0:
                # Update Material
                supabase_admin.table('materials').update({'current_stock': qty_physical}).eq('id', mat_id).execute()
                
                # Create Adjustment Record
                supabase_admin.table('inventory_adjustments').insert({
                    'session_id': str(session_id),
                    'material_id': mat_id,
                    'location_id': line['location_id'], # Reporting purposes
                    'qty_before': current_val,
                    'qty_after': qty_physical,
                    'delta': delta,
                    'reason_code': line.get('reason_code') or 'CYCLE_COUNT',
                    'approved_by': user_id
                }).execute()
        
        # 3. Update Session
        res = supabase_admin.table('cycle_count_sessions').update({
            'status': 'APPROVED',
            'approved_by': user_id,
            'approved_at': datetime.now().isoformat()
        }).eq('id', str(session_id)).execute()
        
        return res.data[0]

    @staticmethod
    def reject_session(session_id: UUID, user_id: str):
        res = supabase_admin.table('cycle_count_sessions').update({
            'status': 'REJECTED'
            # Could add rejected_by/reason columns if needed, keeping simple
        }).eq('id', str(session_id)).execute()
        return res.data[0]
