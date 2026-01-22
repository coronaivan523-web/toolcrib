import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

async def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase credentials")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("--- Inspecting Materials Table Columns ---")
    try:
        # Fetch one record with all columns to see keys
        res = supabase.table('materials').select('*').limit(1).execute()
        
        if res.data:
            print("Columns found in response keys:")
            keys = res.data[0].keys()
            for k in sorted(keys):
                print(f" - {k}: {res.data[0][k]}")
        else:
            print("No data found in materials table.")
            
    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    asyncio.run(main())
