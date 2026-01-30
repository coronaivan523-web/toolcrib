
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
try:
    from app.core.config import settings
except:
    class Settings:
        SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
        SUPABASE_SERVICE_KEY = os.getenv("VITE_SUPABASE_SERVICE_KEY")
    settings = Settings()

def reload_schema():
    print("--- Reloading Supabase Schema Cache ---")
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    try:
        # Method 1: RPC if available (unlikely)
        # Method 2: Raw SQL via PostgREST if enable-raw-sql is on? Usually not via client.
        # But `supabase-py` client doesn't expose raw SQL execution easily unless there is a function.
        # However, we can try to call a standard system function or just rely on the side effect of a DDL?
        # Actually, the best way using the client is to call a stored procedure that executes 'NOTIFY pgrst, "reload schema"'.
        
        # Let's try to create/replace a temporary function that does it.
        # But we can't execute DDL via the client easily.
        
        # Alternative: We can trick it?
        # If we can't run SQL, we might be stuck unless the user has a way to run SQL.
        
        # Wait, the `app.core.supabase` might have a text sql executor if using sqlalchemy? 
        # The project structure showed `app/core/supabase.py`. Let's assume it just has a client.
        
        print("Detailed instruction: You need to run 'NOTIFY pgrst, \"reload schema\";' in your SQL Editor.")
        print("Attempting to call 'reload_schema' RPC just in case...")
        res = supabase.rpc('reload_schema', {}).execute()
        print(f"RPC Result: {res}")
        
    except Exception as e:
        print(f"RPC Failed: {e}")

if __name__ == "__main__":
    reload_schema()
