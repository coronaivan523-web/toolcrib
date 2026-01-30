from app.core.config import settings
from supabase import create_client

print(f"Checking Profiles Table...")

if settings.SUPABASE_SERVICE_KEY:
    admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    res = admin.table('profiles').select('*').execute()
    print(f"Total Profiles: {len(res.data)}")
    for p in res.data:
        print(f"- {p.get('id')} / {p.get('email')} / {p.get('full_name')} / Role: {p.get('role')}")
else:
    print("No Service Key, cannot check independently.")
