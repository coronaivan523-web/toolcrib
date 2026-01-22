
import os
import sys

sys.path.append(os.getcwd())
from app.core.supabase import supabase_admin

def find_material():
    res = supabase_admin.table('materials').select('id, name').eq('sku', 'TEST-SKU-001').execute()
    print(res.data)

if __name__ == "__main__":
    find_material()
