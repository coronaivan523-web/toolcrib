import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

async def check_bucket():
    if not url or not key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return

    supabase: Client = create_client(url, key)

    try:
        # Check if bucket exists
        buckets = supabase.storage.list_buckets()
        print("Buckets found:")
        found = False
        for b in buckets:
            print(f"- {b.name} (id: {b.id}, public: {b.public})")
            if b.id == 'material-images':
                found = True
        
        if found:
            print("\nSUCCESS: 'material-images' bucket exists.")
        else:
            print("\nFAILURE: 'material-images' bucket NOT found.")
            
            # Attempt to create it if using service key
            print("Attempting to create it...")
            try:
                res = supabase.storage.create_bucket('material-images', options={'public': False})
                print(f"Bucket created: {res}")
            except Exception as e:
                print(f"Error creating bucket: {e}")

    except Exception as e:
        print(f"Error listing buckets: {e}")

if __name__ == "__main__":
    asyncio.run(check_bucket())
