import asyncio
from app.core.supabase import supabase

async def list_columns():
    try:
        # We can't easily list columns via PostgREST without a stored procedure or special permissions on information_schema
        # But we can try to select * limit 1 and see keys
        print("Fetching one material...")
        res = supabase.table('materials').select('*').limit(1).execute()
        if res.data:
            print("Columns found in data:")
            print(list(res.data[0].keys()))
        else:
            print("No data in materials table, cannot infer columns from select *.")
            # Try inserting a dummy with minimal fields to see error or success
            # Or just assume if empty.
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_columns())
