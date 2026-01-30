import sys
import asyncio
from app.services.requisition_service import RequisitionService

def test_inbox():
    user_id = "7afa8bf2-72ee-4e6f-ae47-f47816e7997f"
    print(f"Testing get_inbox for {user_id}...")
    try:
        results = RequisitionService.get_inbox(user_id)
        print(f"Success! Found {len(results)} items.")
        if len(results) > 0:
            item0 = results[0]
            print(f"First item ID: {item0.get('id')}")
            # Check for material in items
            items = item0.get('items', [])
            if items:
                print(f"First item material fetch check: {items[0].get('material', 'MISSING')}")
            else:
                print("No items in requisition to check nested fetch.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_inbox()
