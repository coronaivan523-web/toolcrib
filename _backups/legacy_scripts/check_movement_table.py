
import asyncio
from app.core.supabase import supabase_admin

async def check_table():
    try:
        # Try to select from inventory_movements
        res = supabase_admin.table('inventory_movements').select('*').limit(1).execute()
        print("Table 'inventory_movements' EXISTS.")
    except Exception as e:
        print(f"Table 'inventory_movements' likely DOES NOT exist or error: {e}")

if __name__ == "__main__":
    asyncio.run(check_table())
