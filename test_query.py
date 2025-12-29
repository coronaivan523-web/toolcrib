
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not key:
    print("Error: SUPABASE_SERVICE_KEY not found")
    exit(1)

supabase = create_client(url, key)

# Get the most recent requisition ID to test
try:
    latest = supabase.table('requisitions').select('id').order('created_at', desc=True).limit(1).execute()
    if not latest.data:
        print("No requisitions found to test.")
        exit(0)
        
    req_id = latest.data[0]['id']
    print(f"Testing with Requisition ID: {req_id}")

    # Test the join query exactly as in the service
    res = supabase.table('requisitions').select('*, requester:profiles!requester_id(*)').eq('id', req_id).single().execute()
    
    print("\nResponse Data for 'requester':")
    print(json.dumps(res.data.get('requester'), indent=2))
    
except Exception as e:
    print(f"\nQuery Failed: {e}")
