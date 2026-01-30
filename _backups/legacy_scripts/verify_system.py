import requests
import os
import sys
import json
import uuid
from dotenv import load_dotenv
from supabase import create_client

# Load env vars
load_dotenv()

BASE_URL = "http://127.0.0.1:8101/api/v1"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY not found in .env. Needed for cleaning up test user.")
    sys.exit(1)

# Initialize admin client for cleanup
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

TEST_USER_EMAIL = "test_qa_auto@example.com"
TEST_USER_PASSWORD = "Password123!"
TEST_USERNAME = "qa_auto_user"

def print_result(step, success, details=None):
    status = "[PASS]" if success else "[FAIL]"
    print(f"{status} - {step}")
    if details:
        print(f"   Details: {details}")
    if not success:
        sys.exit(1)

def cleanup_user():
    print("Cleaning up previous test user...")
    try:
        # Find user by email
        # create_client with service key gives admin access
        res = supabase_admin.auth.admin.list_users()
        user = next((u for u in res if u.email == TEST_USER_EMAIL), None)
        if user:
            supabase_admin.auth.admin.delete_user(user.id)
            print("   User deleted.")
    except Exception as e:
        print(f"   Warning during cleanup: {e}")

def main():
    print("=== STARTING SYSTEM VERIFICATION ===\n")
    suffix = str(uuid.uuid4())[:6]


    # 0. Cleanup - Attempt but proceed if fails
    cleanup_user()

    # 1. Signup / Create User via API (or just Signup)
    print(f"Creating test user {TEST_USER_EMAIL}...")
    try:
        user_attributes = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "email_confirm": True,
            "user_metadata": {
                "username": TEST_USERNAME,
                "full_name": "QA Auto Bot"
            }
        }
        user = supabase_admin.auth.admin.create_user(user_attributes)
        print_result("Create User (Admin SDK)", True)
    except Exception as e:
        if "already been registered" in str(e):
             print_result("Create User (Admin SDK)", True, "User already exists, proceeding.")
        else:
             print_result("Create User (Admin SDK)", False, str(e))

    # 2. Login via API
    try:
        payload = {
            "username": TEST_USER_EMAIL, 
            "password": TEST_USER_PASSWORD
        }
        # Correct URL is /auth/login based on auth.py
        response = requests.post(f"{BASE_URL}/auth/login", data=payload)
        
        if response.status_code != 200:
             # Try with actual username if email failed
             payload["username"] = TEST_USERNAME
             response = requests.post(f"{BASE_URL}/auth/login", data=payload)
        
        if response.status_code != 200:
            print_result("Login API", False, f"Status: {response.status_code}, Body: {response.text}")
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            print_result("Login API", False, "No access_token returned")
            
        headers = {"Authorization": f"Bearer {access_token}"}
        print_result("Login API", True, "Token acquired")

    except Exception as e:
        print_result("Login API", False, str(e))

    # 3. Create Location
    location_id = None
    try:
        # Schema requires 'code'
        loc_code = f"LOC-{suffix}"
        loc_data = {
            "code": loc_code, 
            "description": "Created by QA Auto"
        }
        res = requests.post(f"{BASE_URL}/inventory/locations/", json=loc_data, headers=headers)
        if res.status_code not in [200, 201]:
             print_result("Create Location", False, f"Status: {res.status_code}, Body: {res.text}")
        
        location_id = res.json().get("id")
        print_result("Create Location", True, f"ID: {location_id}")
    except Exception as e:
        print_result("Create Location", False, str(e))

    # 4. Create Material
    material_id = None
    try:
        # Schema requires: sku, name, category, unit_of_measure
        sku = f"DOC-{suffix}"
        mat_data = {
            "sku": sku,
            "name": f"Test Drill Bit {suffix}",
            "description": "High speed steel",
            "category": "Tools",
            "unit_of_measure": "pcs",
            "min_stock": 5,
            "max_stock": 100,
            "location_id": location_id # Optional but good to test
        }
        res = requests.post(f"{BASE_URL}/inventory/materials/", json=mat_data, headers=headers)
        if res.status_code not in [200, 201]:
             print_result("Create Material", False, f"Status: {res.status_code}, Body: {res.text}")
        
        material_id = res.json().get("id")
        print_result("Create Material", True, f"ID: {material_id}")
    except Exception as e:
        print_result("Create Material", False, str(e))

    # 5. Create Movement (IN)
    try:
        # Schema: material_id, movement_type, quantity, reference_type, reference_id(opt), notes(opt)
        mov_data = {
            "material_id": material_id,
            "movement_type": "IN",
            "quantity": 50,
            "reference_type": "INITIAL_LOAD",
            "notes": "Initial Stock via Auto Test"
        }
        res = requests.post(f"{BASE_URL}/inventory/movements/", json=mov_data, headers=headers)
        if res.status_code not in [200, 201]:
             print_result("Create Movement (IN)", False, f"Status: {res.status_code}, Body: {res.text}")
        
        print_result("Create Movement (IN)", True)
    except Exception as e:
        print_result("Create Movement (IN)", False, str(e))


    # 6. Create Ticket
    ticket_id = None
    try:
        # Schema requires 'items' (List[TicketItemCreate]).
        # Can send empty list to create ticket first?
        # Standard flow might need at least one item or empty is allowed.
        ticket_data = {
            "items": []
        }
        res = requests.post(f"{BASE_URL}/tickets/", json=ticket_data, headers=headers)
        if res.status_code not in [200, 201]:
             print_result("Create Ticket", False, f"Status: {res.status_code}, Body: {res.text}")
        
        ticket_id = res.json().get("id")
        print_result("Create Ticket", True, f"ID: {ticket_id}")
    except Exception as e:
        print_result("Create Ticket", False, str(e))

    # 7. Add Item to Ticket
    try:
        item_data = {
            "material_id": material_id,
            "quantity_requested": 2 
            # Note: schema is TicketItemCreate(TicketItemBase) which has quantity_requested
            # Verify_system previously used "quantity". Let's check TicketItemBase in schema again.
            # ticket.py: TicketItemBase has "quantity_requested"
        }
        res = requests.post(f"{BASE_URL}/tickets/{ticket_id}/items", json=item_data, headers=headers)
        if res.status_code not in [200, 201]:
             print_result("Add Ticket Item", False, f"Status: {res.status_code}, Body: {res.text}")
        
        print_result("Add Ticket Item", True)
    except Exception as e:
        print_result("Add Ticket Item", False, str(e))

    # 8. Update Ticket Status
    try:
        # Check update logic
        res = requests.put(f"{BASE_URL}/tickets/{ticket_id}", json={"status": "APPROVED"}, headers=headers)

        if res.status_code not in [200, 201]:
             print_result("Update Ticket Status", False, f"Status: {res.status_code}, Body: {res.text}")
        
        print_result("Update Ticket Status", True)
    except Exception as e:
        print_result("Update Ticket Status", False, str(e))

    print("\n=== ALL SYSTEM CHECKS PASSED ===")

if __name__ == "__main__":
    main()
