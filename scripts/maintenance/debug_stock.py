
import os
from supabase import create_client, Client

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def debug_phantom_stock():
    print("--- Debugging Phantom Stock ---")
    
    # 1. Find the material ID for "Pru-004"
    print("\n1. Finding Material ID for 'Pru-004'...")
    try:
        response = supabase.table('materials').select("*").ilike('part_number', 'Pru-004').execute()
        materials = response.data
        if not materials:
            print("Material 'Pru-004' NOT FOUND.")
            return
        
        material = materials[0]
        material_id = material['id']
        print(f"Found Material: {material['name']} (ID: {material_id})")
        print(f"Current Stock: {material.get('current_stock')}")
        print(f"Pending Stock (from DB view/column): {material.get('pending_stock')}")
        
    except Exception as e:
        print(f"Error fetching material: {e}")
        return

    # 2. Search for active tickets holding this material
    print("\n2. Searching for ACTIVE tickets with this material...")
    # Active statuses usually: 'pending', 'PENDIENTE', 'IN_PROCESS', 'EN PROCESO', 'READY', 'LISTO'
    # Closed statuses: 'DELIVERED', 'ENTREGADO', 'CANCELLED', 'CANCELADO', 'COMPLETED'
    
    try:
        response = supabase.table('ticket_items').select(
            "*, ticket:tickets(*)"
        ).eq('material_id', material_id).execute()
        
        items = response.data
        active_items = []
        
        print(f"Found {len(items)} total ticket items for this material.")
        
        for item in items:
            ticket = item.get('ticket')
            if not ticket:
                print(f"WARNING: Item {item['id']} has no associated ticket!")
                continue
                
            status = ticket.get('status')
            item_status = item.get('item_status') # check item specific status too
            
            # Logic for "Pending" stock typically excludes cancelled/delivered items
            is_ticket_active = status not in ['DELIVERED', 'ENTREGADO', 'CANCELLED', 'CANCELADO', 'COMPLETED', 'REJECTED']
            is_item_active = item_status not in ['cancelled', 'fulfilled']
            
            if is_ticket_active and is_item_active:
                active_items.append({
                    'ticket_folio': ticket.get('folio'),
                    'ticket_id': ticket.get('id'),
                    'ticket_status': status,
                    'item_id': item['id'],
                    'qty_requested': item['quantity_requested'],
                    'item_status': item_status
                })

        if active_items:
            print(f"\n[!] FOUND {len(active_items)} ACTIVE ITEMS RESERVING STOCK:")
            for active in active_items:
                print(f" - Ticket #{active['ticket_folio']} (Status: {active['ticket_status']}) | Item ID: {active['item_id']} | Qty: {active['qty_requested']}")
        else:
            print("\n[?] No active tickets found in Python logic. The issue might be a mismatch in DB view logic.")

    except Exception as e:
        print(f"Error fetching ticket items: {e}")

import asyncio
if __name__ == "__main__":
    asyncio.run(debug_phantom_stock())
