from app.core.config import settings
import sys

print(f"Checking configuration...")
print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
print(f"Are we finding a Service Key? {'YES' if settings.SUPABASE_SERVICE_KEY else 'NO'}")

if not settings.SUPABASE_SERVICE_KEY:
    print("WARNING: Service Key is missing! 'read_users' will fall back to Anon client and fail RLS.")
else:
    print("Service Key is present. 'read_users' should work properly.")
