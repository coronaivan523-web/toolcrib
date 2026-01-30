import asyncio
from app.core.supabase import supabase, supabase_admin

async def check_schema():
    print("Checking 'materials' table structure...")
    
    # Use admin client if available to bypass RLS
    client = supabase_admin if supabase_admin else supabase
    print(f"Using {'ADMIN (Service Role)' if supabase_admin else 'NORMAL (Anon)'} client.")

    try:
        # Always try to insert a dummy to check schema types
        dummy = {
            "part_number": "TEST-TYPE-CHECK-REQ-BY",
            "name": "Test Item req by",
            "process": "Test Process",
            "Area": "Test Area",
            "requested_by": "Test String User" # Text, not UUID
        }
        print(f"Attempting insert with text requested_by: {dummy['requested_by']}")
        try:
            res = client.table('materials').insert(dummy).execute()
            print("Insert SUCCESS! requested_by accepts TEXT.")
            if res.data:
                client.table('materials').delete().eq('id', res.data[0]['id']).execute()
        except Exception as e:
            print(f"Insert FAILED: {e}")
            if "invalid input syntax for type uuid" in str(e):
                print("CONCLUSION: requested_by is STILL UUID (Needs Migration).")
            elif "violates row-level security" in str(e):
                print("CONCLUSION: RLS prevented check. Admin key missing or policy strict.")
            else:
                print(f"CONCLUSION: Insert failed: {e}")
                
    except Exception as e:
        print(f"Error checking schema: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
