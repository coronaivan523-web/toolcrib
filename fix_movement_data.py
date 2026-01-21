import sys
import os
from sqlalchemy import create_engine, text

# Add the project directory to sys.path
sys.path.append(os.getcwd())

from app.core.config import settings

def fix_movement_data():
    """
    Updates inventory movements for REQ-2026-0012 to have the correct reference_id (12).
    """
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as connection:
        # 1. Identify the target movements
        print("Searching for broken movements for REQ-2026-0012...")
        
        # We look for movements where reference_type is REQUISITION and notes contain the req number
        # AND reference_id is null
        search_query = text("""
            SELECT id, notes, reference_id, reference_type 
            FROM inventory_movements 
            WHERE reference_type = 'REQUISITION' 
            AND notes LIKE '%REQ-2026-0012%'
        """)
        
        result = connection.execute(search_query)
        movements = result.fetchall()
        
        if not movements:
            print("No matching movements found. Data might be already correct or criteria not met.")
            return

        print(f"Found {len(movements)} movements to fix:")
        for m in movements:
            print(f" - ID: {m.id}, Current RefID: {m.reference_id}, Notes: {m.notes}")

        # 2. Update the movements
        update_query = text("""
            UPDATE inventory_movements
            SET reference_id = 12
            WHERE reference_type = 'REQUISITION' 
            AND notes LIKE '%REQ-2026-0012%'
            AND reference_id IS NULL
        """)
        
        update_result = connection.execute(update_query)
        connection.commit()
        
        print(f"\nUpdated {update_result.rowcount} rows with reference_id = 12.")

        # 3. Verify
        verify_query = text("""
            SELECT id, reference_id 
            FROM inventory_movements 
            WHERE reference_type = 'REQUISITION' 
            AND notes LIKE '%REQ-2026-0012%'
        """)
        
        final_result = connection.execute(verify_query).fetchall()
        print("\nVerification:")
        for m in final_result:
             print(f" - ID: {m.id}, New RefID: {m.reference_id}")

if __name__ == "__main__":
    fix_movement_data()
