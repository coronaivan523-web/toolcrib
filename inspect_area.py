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

    print("--- Inspecting Materials Data ---")
    try:
        # Try to fetch process_area to see if it exists and has data
        res = supabase.table('materials').select('id, part_number, name, area, process').limit(10).execute()
        
        print(f"Found {len(res.data)} records.")
        for item in res.data:
            print(f"ID: {item.get('id')} | PN: {item.get('part_number')} | Area: {item.get('area')} | Process: {item.get('process')}")
            
    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    asyncio.run(main())
