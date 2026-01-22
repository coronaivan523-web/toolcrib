
import os
import sys
from uuid import uuid4

# Add app to path
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

try:
    from app.services.requisition_service import RequisitionService
    print("Successfully imported RequisitionService")
except Exception as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def test_list():
    print("Attempting to fetch requisitions...")
    try:
        # Call the static method directly
        reqs = RequisitionService.get_requisitions(limit=5)
        print(f"Successfully fetched {len(reqs)} requisitions.")
        if reqs:
            first = reqs[0]
            print("First requisition sample:")
            print(f"ID: {first.get('id')}")
            print(f"Requester Field: {first.get('requester')}")
    except Exception as e:
        print(f"Runtime Error calling get_requisitions: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_list()
