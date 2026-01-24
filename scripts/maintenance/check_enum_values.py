import os
import sys
from supabase import create_client, Client

url = "https://bykumuizmxsclsazeych.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA"

print(f"Connecting to {url}...")
try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"Failed to create client: {e}")
    sys.exit(1)

print("Fetching distinct movement_types...")

try:
    # Fetch a few records to see values
    response = supabase.table("inventory_movements").select("movement_type").limit(20).execute()
    values = set()
    for row in response.data:
        values.add(row['movement_type'])
    print(f"Found values: {values}")
except Exception as e:
    print(f"Error: {e}")
