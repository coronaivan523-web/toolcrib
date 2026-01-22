from app.services.requisition_service import RequisitionService
from app.schemas.requisition import RequisitionSubmit, CustomApprovalStep
from uuid import UUID
import json

def test_submit():
    # Setup test data
    req_id = "bd57df90-c9ad-457f-b98b-9acdde404ba0" # Use an existing draft or id
    user_id = UUID("7afa8bf2-72ee-4e6f-ae47-f47816e7997f") # Ivan Corona
    
    submit_data = RequisitionSubmit(
        custom_approvals=[
            CustomApprovalStep(user_id=user_id, label="Team Mexicano (1)", order=1),
            CustomApprovalStep(user_id=UUID("4389e387-e781-48e7-8347-5269c40d5820"), label="Team Mexicano (2)", order=2)
        ]
    )
    
    # First, let's make sure the requisition is DRAFT and requester matches
    client = RequisitionService._get_admin_client()
    client.table('requisitions').update({"status": "DRAFT", "requester_id": str(user_id)}).eq('id', req_id).execute()
    # Delete old approvals
    client.table('requisition_approvals').delete().eq('requisition_id', req_id).execute()
    
    print("Starting submission...")
    try:
        RequisitionService.submit_requisition(req_id, submit_data, user_id)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_submit()
