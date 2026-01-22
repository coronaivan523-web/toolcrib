
import os
from supabase import create_client, Client

url = "https://bykumuizmxsclsazeych.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODU4NDQsImV4cCI6MjA4MDk2MTg0NH0.DfozRzeTRiReELAZ7GMHjJosHkrPCEixmWS8BMSUFso"

supabase: Client = create_client(url, key)

print("Attempting to fetch materials...")
try:
    response = supabase.table("materials").select("*, location:locations(code)").execute()
    print(f"Success! Found {len(response.data)} materials.")
    if len(response.data) > 0:
        print("Sample data:", response.data[0])
    else:
        print("Data is empty. RLS might be hiding rows or table is empty.")
except Exception as e:
    print(f"Error fetching materials: {e}")

print("\nAttempting to fetch materials without join...")
try:
    response = supabase.table("materials").select("*").execute()
    print(f"Success (no join)! Found {len(response.data)} materials.")
except Exception as e:
    print(f"Error fetching materials (no join): {e}")
