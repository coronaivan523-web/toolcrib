
import os
import sys
from dotenv import load_dotenv

# Add parent dir to path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from supabase import create_client, Client

def verify_catalog_fetch():
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return

    supabase: Client = create_client(url, key)
    
    print("Fetching catalog with new select columns...")
    
    try:
        # Simulate the query from the endpoint
        res = supabase.table('materials').select(
            'id, part_number, name, plant, location, process, area, machine_asset, current_stock, min_stock, image_url'
        ).limit(5).order('part_number').execute()
        
        if not res.data:
            print("No materials found to verify.")
            return

        print(f"Fetched {len(res.data)} items.")
        
        has_image_url_field = 'image_url' in res.data[0]
        
        if has_image_url_field:
            print("SUCCESS: 'image_url' field is present in the response.")
            # Check if any item actually has an image url
            items_with_images = [i for i in res.data if i.get('image_url')]
            print(f"Items with non-null image_url in sample: {len(items_with_images)}")
            if items_with_images:
                print(f"Example image_url: {items_with_images[0]['image_url']}")
        else:
            print("FAILURE: 'image_url' field is MISSING from the response.")
            print("Keys found:", res.data[0].keys())

    except Exception as e:
        print(f"Query failed: {e}")

if __name__ == "__main__":
    verify_catalog_fetch()
