import os
from supabase import create_client, Client

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception as e:
    print(f"Warning: Could not read .env: {e}")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars.")
    exit(1)

supabase: Client = create_client(url, key)

print("\n--- INSPECTING MOVEMENTS FOR REQ-2026-0012 / MATERIAL ID 2 ---")
# Buscamos movimientos recientes para el material 2
try:
    response = supabase.table("inventory_movements")\
        .select("*")\
        .eq("material_id", 2)\
        .order("timestamp", desc=True)\
        .limit(5)\
        .execute()
    
    movements = response.data
    for m in movements:
        print(f"ID: {m['id']}")
        print(f"  Type: {m['movement_type']}")
        print(f"  Ref Type: {m['reference_type']}")
        print(f"  Ref ID: {m['reference_id']}")
        print(f"  Notes: '{m['notes']}'")
        print("-" * 20)

except Exception as e:
    print(f"Error: {e}")
