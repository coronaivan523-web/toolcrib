
import os
import asyncio
from app.core.supabase import supabase

async def main():
    try:
        print("Fetching profiles...")
        res = supabase.table('profiles').select('*').execute()
        profiles = res.data
        print(f"Found {len(profiles)} profiles.")
        for p in profiles:
            print(f"ID: {p.get('id')} | Email: {p.get('email')} | FullName: {p.get('full_name')} | Role: {p.get('role')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
