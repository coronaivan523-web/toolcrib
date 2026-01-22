
import os
import sys
import json
from decimal import Decimal
from datetime import date, datetime

sys.path.append(os.getcwd())
from app.core.supabase import supabase_admin, supabase

# Helper to handle potential decimal/date types
class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal): return float(obj)
        if isinstance(obj, (date, datetime)): return str(obj)
        return super().default(obj)

def dump_mats():
    client = supabase_admin if supabase_admin else supabase
    res = client.table('materials').select('*').execute()
    data = res.data
    # Map fields to Frontend Expected format
    # Frontend expects: id, part_number, name (description?), current_stock, plant (factory?), location
    # DB has: id, part_number, description, current_stock, factory, location
    
    formatted = []
    for m in data:
        formatted.append({
            "id": m['id'],
            "part_number": m['part_number'],
            "name": m.get('description', ''),
            "current_stock": m.get('current_stock', 0),
            "plant": m.get('factory', 'Planta 1'),
            "location": m.get('location', '')
        })
        
    print(json.dumps(formatted, cls=Encoder, indent=4))

if __name__ == "__main__":
    dump_mats()
