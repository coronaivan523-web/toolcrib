from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase Client (Anon)
url: str = settings.SUPABASE_URL
key: str = settings.SUPABASE_KEY
supabase: Client = create_client(url, key)

# Initialize Supabase Admin Client (Service Role)
# Only use this for backend administrative tasks (creating users, bypassing RLS)
supabase_admin: Client = None
if settings.SUPABASE_SERVICE_KEY:
    supabase_admin = create_client(url, settings.SUPABASE_SERVICE_KEY)
