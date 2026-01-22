import os
import sys
import asyncio
from uuid import uuid4

# Ensure we can import app
sys.path.append(os.getcwd())

from app.services.requisition_service import RequisitionService
from app.schemas.requisition import RequisitionCreate, RequisitionItemCreate, RequisitionPriority

def test_create():
    print("Testing Requisition Creation with Cause...")
    try:
        # Mock Data
        requester_id = uuid4() # Random UUID, might fail if FK constraint on profiles? 
        # Actually RequisitionService uses admin client, but insert might check FK?
        # Let's try to get a real user if possible, or use a known one if we knew one.
        # But wait, create_draft does: "requester_id": str(requester_id)
        # If DB has FK constraint `requester_id -> profiles.id`, random UUID will fail.
        
        # We need a valid user ID. 
        # Let's try to fetch one from DB first using service or raw client.
        from app.core.supabase import supabase
        res = supabase.table('profiles').select('id').limit(1).execute()
        if not res.data:
            print("No profiles found to use as requester.")
            return
        
        valid_user_id = res.data[0]['id']
        print(f"Using requester_id: {valid_user_id}")

        # Create Payload
        payload = RequisitionCreate(
            priority=RequisitionPriority.NORMAL,
            justification="Test Cause Persistence",
            department="Test Dept",
            job_title="Tester",
            cause="OP", # Header Cause (New?)
            criticality_requested="C1",
            requester_name="Test User",
            items=[
                RequisitionItemCreate(
                    material_id=1, # Assuming material 1 exists
                    quantity_requested=5,
                    unit="EA",
                    notes="Test Item",
                    cause="LS" # Line Item Cause
                )
            ]
        )

        print("Payload created. Creating draft...")
        draft = RequisitionService.create_draft(valid_user_id, payload)
        
        print(f"Draft Created: {draft['id']}")
        print(f"Header Cause: {draft.get('cause')}")
        item = draft['items'][0]
        print(f"Item Cause: {item.get('cause')}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_create()
