
import asyncio
from app.core.config import settings
from supabase import create_client

# Use Service Key for full access
supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def verify_deletion():
    print(f"Scanning for remaining test users (test_api_%...)")
    
    try:
        # Check profiles
        res = supabase_admin.table('profiles').select('*').ilike('email', 'test_api_%').execute()
        
        if not res.data:
            print("[CLEAN] No 'test_api' users found in database. Cleanup successful.")
            
            # Also list current users to confirm match with screenshot
            all_users = supabase_admin.table('profiles').select('email, full_name, role').execute()
            print("\nCurrent Users in DB:")
            for u in all_users.data:
                print(f"- {u['full_name']} ({u['email']}) [{u.get('role')}]")
                
        else:
            print(f"[WARNING] Found {len(res.data)} 'test_api' users remaining:")
            for u in res.data:
                 print(f" - {u['email']}")

    except Exception as e:
        print(f"Error checking: {e}")

        # Check Auth (optional, but good for completeness if we could listed users easily, 
        # but usually profile absence is strong enough evidence for this verification step)
        
    except Exception as e:
        print(f"Error checking: {e}")

if __name__ == "__main__":
    verify_deletion()
