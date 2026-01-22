import os
import sys
from datetime import datetime

# Ensure we can import app
sys.path.append(os.getcwd())

from app.core.config import settings
from app.core.supabase import supabase_admin

def debug_connection():
    print("--- CONNECTION DEBUG ---")
    print(f"Supabase URL: {settings.SUPABASE_URL}")
    print(f"Service Key Present: {bool(settings.SUPABASE_SERVICE_KEY)}")
    
    # Try to list today's reqs
    print("\n--- TODAY'S REQUISITIONS ---")
    
    # Get today's start
    # Simplified, just list last 20 by created_at desc
    if not supabase_admin:
        print("No Admin Client!")
        return

    res = supabase_admin.table('requisitions').select('id, req_number, created_at, status, cause').order('created_at', desc=True).limit(20).execute()
    
    if res.data:
        for r in res.data:
            print(f"ID: {r['id']}")
            print(f"Number: {r.get('req_number')}")
            print(f"Created: {r['created_at']}")
            print(f"Status: {r['status']}")
            print(f"Header Cause: {r.get('cause')}")
            
            # Fetch Items count
            ires = supabase_admin.table('requisition_items').select('id, notes, cause').eq('requisition_id', r['id']).execute()
            print(f"Items: {len(ires.data)}")
            for i in ires.data:
                print(f"  - [{i['id']}] {i['notes']} (Cause: {i['cause']})")
            print("-" * 20)
    else:
        print("No requisitions found.")

if __name__ == "__main__":
    debug_connection()
