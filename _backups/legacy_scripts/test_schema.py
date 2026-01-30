import requests
import json
import uuid

# Configuration
API_BASE = "http://localhost:8001/api/v1"
TOKEN = "YOUR_TOKEN_HERE" # Need to get this from a running session if possible, or skip auth if dev

def test_create_with_diff_requester():
    # Replace these with actual IDs from your DB if needed, 
    # but for schema check any UUID format works if auth is bypassed or valid
    creator_id = "4389e387-e781-48e7-8347-5269c40d5820" # Supervisor Test
    requester_id = "7afa8bf2-72ee-4e6f-ae47-f47816e7997f" # Ivan Corona
    
    payload = {
        "requester_id": requester_id,
        "requester_name": "Ivan Corona Test",
        "department": "Engineering",
        "job_title": "Engineer",
        "justification": "Testing requester logic",
        "priority": "NORMAL",
        "criticality_requested": "C1",
        "cause": "OP",
        "items": [
            {
                "material_id": 3,
                "quantity_requested": 1,
                "unit": "EA",
                "notes": "Test item",
                "cause": "OP",
                "cost_center": "TP060000"
            }
        ],
        "attachments": []
    }
    
    print("Testing payload...")
    print(json.dumps(payload, indent=2))
    
    # Actually, I can just test Pydantic validation locally
    from app.schemas.requisition import RequisitionCreate
    try:
        req_obj = RequisitionCreate(**payload)
        print("\nPydantic validation SUCCESS!")
        print(f"Parsed requester_id: {req_obj.requester_id}")
    except Exception as e:
        print(f"\nPydantic validation FAILED: {e}")

if __name__ == "__main__":
    test_create_with_diff_requester()
