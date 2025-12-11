import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def login(username, password):
    url = f"{BASE_URL}/auth/login"
    data = {
        "username": username,
        "password": password
    }
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        sys.exit(1)

def create_material(token, sku, name):
    url = f"{BASE_URL}/inventory/materials"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "sku": sku,
        "name": name,
        "category": "Test",
        "unit_of_measure": "Unit",
        "min_stock": 0,
        "max_stock": 100
    }
    # Try to get first
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        for m in response.json():
            if m["sku"] == sku:
                return m
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 400 and "already exists" in response.text:
         # If exists, we need to find it to get ID
         response = requests.get(url, headers=headers)
         for m in response.json():
            if m["sku"] == sku:
                return m
    else:
        print(f"Create material failed: {response.text}")
        sys.exit(1)

def create_movement(token, material_id, type, quantity):
    url = f"{BASE_URL}/inventory/movements"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "material_id": material_id,
        "movement_type": type,
        "quantity": quantity,
        "reference_type": "TEST",
        "notes": "Automated test"
    }
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Create movement {type} failed: {response.text}")
        sys.exit(1)

def get_material(token, material_id):
    url = f"{BASE_URL}/inventory/materials/{material_id}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Get material failed: {response.text}")
        sys.exit(1)

def main():
    # Using existing admin user
    print("1. Logging in...")
    token = login("admin@toolcrib.com", "admin123")
    print("   Login successful.")

    print("2. Getting/Creating Material...")
    material = create_material(token, "TEST-SKU-001", "Test Material")
    material_id = material["id"]
    initial_stock = material["current_stock"]
    print(f"   Material ID: {material_id}, Initial Stock: {initial_stock}")

    print("3. Adding Stock (IN)...")
    create_movement(token, material_id, "IN", 10)
    
    updated_material = get_material(token, material_id)
    print(f"   New Stock: {updated_material['current_stock']}")
    
    if updated_material['current_stock'] == initial_stock + 10:
        print("   SUCCESS: Stock increased correctly.")
    else:
        print("   FAILURE: Stock did not increase correctly.")

    print("4. Removing Stock (OUT)...")
    create_movement(token, material_id, "OUT", 5)
    
    final_material = get_material(token, material_id)
    print(f"   Final Stock: {final_material['current_stock']}")

    if final_material['current_stock'] == initial_stock + 10 - 5:
        print("   SUCCESS: Stock decreased correctly.")
    else:
        print("   FAILURE: Stock did not decrease correctly.")

if __name__ == "__main__":
    main()
