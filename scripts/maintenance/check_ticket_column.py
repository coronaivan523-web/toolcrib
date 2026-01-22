from app.core.supabase import supabase
import sys

def check_column():
    try:
        # Try to select the column to see if it exists
        print("Checking for ticket_id column in cycle_count_sessions...")
        res = supabase.table('cycle_count_sessions').select('ticket_id').limit(1).execute()
        print("Success! Column exists.")
        print(res.data)
    except Exception as e:
        print("\nERROR: Column might be missing or other error.")
        print(e)

if __name__ == "__main__":
    check_column()
