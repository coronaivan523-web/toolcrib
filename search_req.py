import os
import sys

# Ensure we can import app
sys.path.append(os.getcwd())

from app.services.requisition_service import RequisitionService
from app.core.supabase import supabase_admin

def search_req():
    print("Searching for requisition with 'Test Drill Bit' (Admin)...")
    try:
        if not supabase_admin:
            print("Admin client not available. Checking Env...")
            from app.core.config import settings
            print(f"Service Key present? {bool(settings.SUPABASE_SERVICE_KEY)}")
            return

        # Search in items using Admin Client
        res = supabase_admin.table('requisition_items').select('*').ilike('notes', '%Drill Bit%').execute()
        
        if not res.data:
            print("No items found with matching description.")
            return

        print(f"Found {len(res.data)} matching items.")
        for item in res.data:
            print(f"Item ID: {item.get('id')}")
            print(f"Req ID: {item.get('requisition_id')}")
            print(f"Notes: {item.get('notes')}")
            print(f"CAUSE: {item.get('cause')}")
            
            # Fetch Requisition Header
            try:
                # Use Service (Uses Admin)
                req = RequisitionService.get_requisition_by_id(item['requisition_id'])
                print(f"Req Header Cause: {req.get('cause')}")
                print(f"Req Created At: {req.get('created_at')}")
            except Exception as e:
                print(f"Could not fetch header: {e}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    search_req()
