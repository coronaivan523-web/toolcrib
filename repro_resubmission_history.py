
import requests
import json
import time

BASE_URL = "http://localhost:8001/api/v1"

# 1. Login Helper
def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code != 200:
        print(f"Login failed for {email}: {resp.text}")
        return None, None
    data = resp.json()
    return data['access_token'], data['user']['id']

# 2. Main Test
def test_resubmission_history():
    print("--- 1. Login as Requester (Ivan) ---")
    token_req, id_req = login("ivan.corona@wasion-gto.com", "password123")
    headers_req = {"Authorization": f"Bearer {token_req}"}

    print("--- 2. Login as Approver (Enrique) ---")
    # Assuming Enrique is the manager. If not, we might need to look up who is.
    # For testing, we can force the approver ID if we know it, or just use the one assigned.
    token_mgr, id_mgr = login("enrique.mora@wasion-gto.com", "password123")
    headers_mgr = {"Authorization": f"Bearer {token_mgr}"}

    # 3. Create Requisition
    print("--- 3. Create Draft Requisition ---")
    req_payload = {
        "items": [{"material_id": 1, "quantity_requested": 5}],
        "priority": "NORMAL",
        "justification": "Test Resubmission History"
    }
    resp = requests.post(f"{BASE_URL}/requisitions", json=req_payload, headers=headers_req)
    if resp.status_code != 200:
        print(f"Create failed: {resp.text}")
        return
    req_id = resp.json()['id']
    print(f"Created Req ID: {req_id}")

    # 4. Submit Requisition
    print("--- 4. Submit Requisition ---")
    submit_payload = {
        "gerente_mx_id": id_mgr,
        "gerente_ch_id": id_mgr, # Simplified
        "gerente_gral_id": None
    }
    resp = requests.post(f"{BASE_URL}/requisitions/{req_id}/submit", json=submit_payload, headers=headers_req)
    if resp.status_code != 200:
        print(f"Submit failed: {resp.text}")
        return
    
    # 5. Reject (Manager)
    print("--- 5. Reject Step (Manager) ---")
    # Provide a tiny delay to ensure timestamps differ
    time.sleep(1)
    reject_payload = {"comment": "Please fix quantity (Mock Rejection)"}
    resp = requests.post(f"{BASE_URL}/requisitions/{req_id}/reject-step", json=reject_payload, headers=headers_mgr)
    if resp.status_code != 200:
        print(f"Reject failed: {resp.text}")
        return
    print("Rejected successfully.")

    # 6. Resubmit (Requester) with Correction Note
    print("--- 6. Resubmit (Requester) with Note ---")
    time.sleep(1)
    correction_note = "Fixed the quantity to 10. (User Response)"
    resubmit_payload = {
        "resubmission_comment": correction_note
    }
    resp = requests.post(f"{BASE_URL}/requisitions/{req_id}/submit", json=resubmit_payload, headers=headers_req)
    if resp.status_code != 200:
        print(f"Resubmit failed: {resp.text}")
        # print full error if 500
        return
    print("Resubmitted successfully.")

    # 7. Verification: Fetch Requisition and Check History
    print("--- 7. Verifying History ---")
    resp = requests.get(f"{BASE_URL}/requisitions/{req_id}", headers=headers_req)
    data = resp.json()
    approvals = data.get('approvals', [])
    
    # Check for "CORRECCIÓN" step
    correction_step = next((s for s in approvals if s.get('step_name') == 'CORRECCIÓN'), None)
    
    if correction_step:
        print(f"[SUCCESS] Found Correction Step!")
        print(f"  - Status: {correction_step['step_status']}")
        print(f"  - Comment: {correction_step['comment']}")
        
        if correction_step['comment'] == correction_note:
             print("[PASS] Comment matches.")
        else:
             print("[FAIL] Comment mismatch.")
    else:
        print("[FAIL] Correction step NOT found in approvals list.")
        for s in approvals:
            print(f"  - {s['step_name']} ({s['step_status']}): {s.get('comment')}")

if __name__ == "__main__":
    test_resubmission_history()
