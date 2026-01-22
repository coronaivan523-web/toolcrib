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

def get_user_client(auth_token: str) -> Client:
    """
    Creates a user-scoped Supabase client.
    This client is initialized with the Anon Key but authenticates
    PostgREST with the user's JWT.
    This ensures RLS policies are applied correctly.
    """
    # 1. Initialize with ANON key (public safe key)
    client = create_client(url, key)
    
    # 2. Set the Auth Header for PostgREST to the User's Token
    client.postgrest.auth(auth_token)
    
    return client
