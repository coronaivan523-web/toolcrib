
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def backfill_history():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    TICKET_ID = 'C2026-000001'
    print(f"\n--- Backfilling History for Session {TICKET_ID} ---")
    
    # 1. Get Session ID from Ticket ID
    sess_res = supabase.table('cycle_count_sessions').select('id, ticket_id').eq('ticket_id', TICKET_ID).single().execute()
    if not sess_res.data:
        print("Session not found!")
        return
        
    session_id = sess_res.data['id']
    print(f"Session UUID: {session_id}")
    
    # 2. Get Lines
    lines_res = supabase.table('cycle_count_lines').select('*').eq('session_id', session_id).execute()
    lines = lines_res.data
    print(f"Found {len(lines)} lines.")
    
    for line in lines:
        if line.get('qty_physical') is None:
            continue
            
        line_id = line['id']
        material_id = line['material_id']
        qty = line['qty_physical']
        
        # Check if movement exists via NOTES (since ref_id is int)
        # We need to filter by reference_type='CYCLE_COUNT' AND notes contains line_id
        # Supabase filtering with 'like'
        move_res = supabase.table('inventory_movements')\
            .select('*')\
            .eq('reference_type', 'CYCLE_COUNT')\
            .ilike('notes', f'%{line_id}%')\
            .execute()
            
        if move_res.data:
            print(f"Skipping Line {line_id} (Movement exists)")
            continue
            
        prev_stock = line.get('qty_system', 0)
        delta = qty - prev_stock
        
        print(f"Backfilling Material {material_id}: Prev={prev_stock}, New={qty}, Delta={delta}")
        
        payload = {
            "material_id": material_id,
            "quantity": abs(delta),
            "quantity_change": delta,
            "new_stock_level": qty,
            "previous_stock_level": prev_stock,
            "movement_type": "IN" if delta >= 0 else "OUT",
            "reference_type": "CYCLE_COUNT",
            "reference_id": None,
            "notes": f"System Backfill (Missing History) [RefLine:{line_id}]",
            "created_by": None # Safe fallback
        }
        
        try:
            supabase.table('inventory_movements').insert(payload).execute()
            print(" -> SUCCESS")
        except Exception as e:
            print(f" -> FAILED: {e}")

if __name__ == "__main__":
    backfill_history()
