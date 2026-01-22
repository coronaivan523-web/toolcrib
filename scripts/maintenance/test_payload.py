from app.schemas.requisition import RequisitionCreate
import json

def test_payload():
    # Simulate the 'header' state from RequisitionFormModal.jsx
    header = {
        "priority": "NORMAL",
        "justification": "Testing",
        "department": "Mantenimiento",
        "job_title": "Jefe",
        "requester_name": "Ivan Corona",
        "requester_id": "7afa8bf2-72ee-4e6f-ae47-f47816e7997f", # Selected via Autocomplete
        "cause": "OP",
        "criticality_requested": "C2"
    }
    
    # Simulate the 'payload' creation in saveOrSubmit
    payload = {
        **header,
        "priority": "HIGH", # Overwritten by logic
        "items": [
            {
                "material_id": 3,
                "quantity_requested": 5,
                "unit": "EA",
                "notes": "Test",
                "cause": "OP",
                "cost_center": "CC"
            }
        ],
        "attachments": []
    }
    
    print("Simulated Payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        req_obj = RequisitionCreate(**payload)
        print("\nSUCCESS: requester_id is", req_obj.requester_id)
        if req_obj.requester_id is None:
             print("WARNING: requester_id is NONE!")
    except Exception as e:
        print("\nERROR:", e)

if __name__ == "__main__":
    test_payload()
