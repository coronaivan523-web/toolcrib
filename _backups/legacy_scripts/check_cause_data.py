import os
import sys
import asyncio

# Ensure we can import app
sys.path.append(os.getcwd())

from app.services.requisition_service import RequisitionService

def check_cause():
    print("Checking 'requisition_items' via Service with Dates...")
    try:
        # Fetch last 10 requisitions
        reqs = RequisitionService.get_requisitions(skip=0, limit=10)
        
        if not reqs:
            print("No requisitions found via Service.")
            return

        print(f"Found {len(reqs)} recent requisitions.")
        for req in reqs:
            print(f"Req ID: {req.get('id')}")
            print(f"Created At: {req.get('created_at')}")
            print(f"Status: {req.get('status')}")
            
            items = req.get('items', [])
            has_cause = False
            for item in items:
                cause = item.get('cause')
                if cause:
                    has_cause = True
                    print(f"  - Item {item.get('id')}: CAUSE = {cause}")
            
            if not has_cause:
                print("  - No items have CAUSE.")
            
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_cause()
