
from app.core.config import settings
from supabase import create_client
import time
from datetime import datetime

def check_time():
    print(f"Local PC Time: {datetime.now()}")
    
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY
    
    try:
        client = create_client(url, key)
        # Call a postgres function or just select now() via rpc if available, 
        # but standardized way is usually selecting from a table or known function.
        # We can simulate select now() by creating a dummy rpc or just checking a recent interaction?
        # Supabase-py doesn't currently support raw SQL easily without RPC.
        # But we can query a table and check `created_at` if we insert? No.
        
        # Let's try to list a table and see if we can get metadata? 
        # Actually simplest way: 'SELECT NOW()' isn't exposed via REST API unless wrapped in a view or function.
        # But wait, looking at `debug_skew.py`, I can just list requisitions.
        
        print("Checking connection...")
        # There isn't a direct "get server time" in PostgREST unless we have a function.
        # I'll create a quick RPC text if I could, but I can't easily.
        # However, I can look at the error message details or headers?
        
        # Better Idea: I'll assume standard UTC.
        # But to be sure, I will assume the user wants me to "Browse" the newtork.
        # I will simpler: I will explain to the user I am checking, but technically I can't "Update" the server time.
        
        # Actually, let's try to query a record we just made (in previous step) and see its `created_at`?
        res = client.table('requisitions').select('created_at').order('created_at', desc=True).limit(1).execute()
        if res.data:
            last_req = res.data[0]['created_at']
            print(f"Last Created Record (Server Time): {last_req}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_time()
