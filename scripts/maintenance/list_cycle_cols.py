
import asyncio
from app.core.supabase import supabase_admin

def list_cols():
    try:
        # Try to select one row and inspect keys
        res = supabase_admin.table('cycle_count_lines').select('*').limit(1).execute()
        if res.data:
            print("Columns found in cycle_count_lines:")
            print(list(res.data[0].keys()))
        else:
            print("No data in table to infer columns.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_cols()
