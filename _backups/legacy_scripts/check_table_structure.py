from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url:
    url = os.environ.get("SUPABASE_URL")
if not key:
    key = os.environ.get("SUPABASE_SERVICE_KEY")

print(f"URL: {url}")
# print(f"Key: {key}")

supabase = create_client(url, key)

try:
    # Fetch one row
    res = supabase.table("materials").select("*").limit(1).execute()
    if res.data:
        print("Keys found in 'materials' table:")
        print(list(res.data[0].keys()))
    else:
        print("Table 'materials' is empty, cannot infer columns from data.")
except Exception as e:
    print(f"Error: {e}")
