
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

def check_image_data():
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return

    supabase: Client = create_client(url, key)
    
    # 1. Fetch materials with image_url
    print("\n--- Inspecting Material Image URLs ---")
    try:
        res = supabase.table('materials').select('id, part_number, image_url').neq('image_url', 'null').limit(5).execute()
        for item in res.data:
            print(f"ID: {item['id']}, Part: {item['part_number']}, Image URL: '{item['image_url']}'")
    except Exception as e:
        print(f"Error fetching materials: {e}")

    # 2. List Buckets (Using REST API via Supabase client if possible, or inference)
    # The python client might not support list_buckets directly in all versions, 
    # but we can try to access storage.
    print("\n--- Checking Storage Buckets ---")
    try:
        buckets = supabase.storage.list_buckets()
        for b in buckets:
            print(f"Bucket: {b.name}, Public: {b.public}")
            
            # Try to list files in this bucket to see structure
            try:
                files = supabase.storage.from_(b.name).list()
                print(f"  - Sample files in '{b.name}': {[f['name'] for f in files[:3]]}")
            except Exception as e:
                print(f"  - Error listing files in '{b.name}': {e}")
                
    except Exception as e:
        print(f"Error listing buckets: {e}")

if __name__ == "__main__":
    check_image_data()
