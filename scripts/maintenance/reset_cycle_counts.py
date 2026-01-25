
import os
import sys
from supabase import create_client

# Add app directory to path
sys.path.append(os.getcwd())

from app.core.config import settings

def reset_cycle_count_data():
    if not settings.SUPABASE_URL:
        print("Error: SUPABASE_URL not set")
        return

    confirmed = input("WARNING: This will DELETE ALL Cycle Counts and related Inventory Movements. Type 'YES' to proceed: ")
    if confirmed != "YES":
        print("Operation cancelled.")
        return

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Resetting Cycle Count Data ---")
    
    try:
        # 1. Delete Inventory Movements related to Cycle Counts
        print("Deleting Inventory Movements (CYCLE_COUNT)...")
        # Note: We filter by reference_type or movement_type being related to cycle counts
        # Based on service: movement_type='CYCLE_COUNT' or reference_type='CYCLE_COUNT'
        
        # We filter by reference_type being 'CYCLE_COUNT' (Movement type is IN/OUT)
        res_mov = supabase.table('inventory_movements').delete().eq('reference_type', 'CYCLE_COUNT').execute()
        print(f"Deleted {len(res_mov.data) if res_mov.data else 0} movements.")
        
        # Also delete legacy ones where reference_type might be CYCLE_COUNT but movement_type is IN/OUT
        res_mov_legacy = supabase.table('inventory_movements').delete().eq('reference_type', 'CYCLE_COUNT').execute()
        print(f"Deleted {len(res_mov_legacy.data) if res_mov_legacy.data else 0} legacy movements.")

        # 2. Delete Cycle Count Lines
        print("Deleting Cycle Count Lines...")
        # Delete all lines. RLS might block if not service key, but we have service key.
        # We use neq id '0' to match all non-null (basically all)
        # Or just gt id '00000000-0000-0000-0000-000000000000'
        # Actually simplest way to delete all is usually proper where clause.
        # supabase-py requires a filter for delete.
        res_lines = supabase.table('cycle_count_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print(f"Deleted {len(res_lines.data) if res_lines.data else 0} lines.")

        # 3. Delete Cycle Counts (Headers)
        print("Deleting Cycle Counts...")
        res_counts = supabase.table('cycle_counts').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print(f"Deleted {len(res_counts.data) if res_counts.data else 0} cycle counts.")
        
        print("\nSUCCESS: Cycle Count history cleared.")

    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    reset_cycle_count_data()
