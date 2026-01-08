
from app.core.config import settings
from supabase import create_client
import time

def test_service_key():
    print(f"Current System Time: {time.ctime()}")
    print("Testing Supabase Service Key...")
    
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY
    
    if not key:
        print("ERROR: SUPABASE_SERVICE_KEY not found in settings!")
        return

    try:
        client = create_client(url, key)
        print("Client created.")
        
        # Try a read operation (bypass RLS)
        print("Attempting to fetch requisitions (limit 1)...")
        res = client.table('requisitions').select('id').limit(1).execute()
        print(f"Success! Data: {res.data}")
        
    except Exception as e:
        print(f"FAILED with error: {e}")
        try:
            if hasattr(e, 'code'):
                print(f"Error Code: {e.code}")
            if hasattr(e, 'message'):
                print(f"Error Message: {e.message}")
        except:
            pass

if __name__ == "__main__":
    test_service_key()
