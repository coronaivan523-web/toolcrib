
import os
import sys
from uuid import uuid4
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

from app.services.cycle_count_service import CycleCountService
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate
from app.core.supabase import supabase_admin

load_dotenv('.env')

def verify_fix():
    print("--- Verifying Cycle Count Logic Fix ---")
    
    # 1. Pick a material
    # We use material ID 5 which we just fixed to 0
    mat_id = 5 
    
    # Check initial stock
    mat = supabase_admin.table('materials').select('current_stock').eq('id', mat_id).single().execute()
    initial_stock = mat.data['current_stock']
    print(f"Initial Stock for Mat {mat_id}: {initial_stock}")
    
    if initial_stock is None:
        print("ERROR: Stock is NULL before test! Fix script didn't work?")
        return

    # 2. Get a valid User ID (to satisfy UUID/FK constraints)
    try:
        u_res = supabase_admin.table('profiles').select('id').limit(1).single().execute()
        user_id = u_res.data['id']
    except:
        user_id = str(uuid4()) # Fallback if no profiles, though unlikely
    
    print(f"Using User ID: {user_id}")
    
    try:
        session_data = CycleCountSessionCreate(
            planned_date="2026-02-01",
            assigned_to=None
        )
        session = CycleCountService.create_session(session_data, user_id)
        session_id = session['id']
        print(f"Created Session: {session_id}")
        
        # 3. Add Line (The operation that caused the bug)
        # Verify we are passing qty_physical=None (Assignment)
        line_data = CycleCountLineCreate(
            material_id=mat_id,
            qty_physical=None,
            notes="Verification Test"
        )
        
        line = CycleCountService.add_line(session_id, line_data, user_id)
        print(f"Added Line: {line['id']}")
        
        # 4. Check Stock AGAIN
        mat_after = supabase_admin.table('materials').select('current_stock').eq('id', mat_id).single().execute()
        final_stock = mat_after.data['current_stock']
        print(f"Final Stock for Mat {mat_id}: {final_stock}")
        
        if final_stock is None:
            print("FAILED: Stock was wiped to NULL!")
        elif final_stock == initial_stock:
            print("PASSED: Stock remained unchanged.")
        else:
            print(f"WARNING: Stock changed to {final_stock}, but at least not NULL.")

    except Exception as e:
        print(f"Test Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_fix()
