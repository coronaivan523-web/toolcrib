import os
import asyncio
from supabase import create_client, Client

# Configuración (Asumiendo que las variables de entorno están o las pongo hardcoded para el script temporal si es necesario, 
# pero mejor intento leerlas o usar las que ya usa el backend si puedo importar config)
# Para simplificar y ser robusto en este entorno `scratch`, voy a intentar leer del .env del frontend si existe, o pedirle al usuario.
# PERO, el usuario ya tiene el backend corriendo. Podría intentar usar el código del backend. 

# Mejor enfoque: Usar las credenciales que usa el frontend.
# Voy a leer el archivo .env del frontend para obtener URL y KEY.

def get_env_vars(filepath):
    vars = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    vars[key] = value
    except Exception as e:
        print(f"Error reading .env: {e}")
    return vars

frontend_env = get_env_vars(r'C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\.env')
SUPABASE_URL = frontend_env.get('VITE_SUPABASE_URL')
SUPABASE_KEY = frontend_env.get('VITE_SUPABASE_ANON_KEY')

# Si no están en el frontend .env (a veces están en .env.local), intentar .env.local
if not SUPABASE_URL:
    frontend_env_local = get_env_vars(r'C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\frontend\.env.local')
    SUPABASE_URL = frontend_env_local.get('VITE_SUPABASE_URL')
    SUPABASE_KEY = frontend_env_local.get('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: No se pudieron encontrar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en frontend/.env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def main():
    print(f"Conectando a Supabase: {SUPABASE_URL}")
    
    # 1. Buscar el material 'Pru-004'
    print("Buscando material 'Pru-004'...")
    res = supabase.from_('materials').select('*').eq('part_number', 'Pru-004').execute()
    materials = res.data
    
    if not materials:
        print("Error: Material 'Pru-004' no encontrado.")
        return

    material = materials[0]
    material_id = material['id']
    print(f"Material encontrado: {material['name']} (ID: {material_id})")
    print(f"Stock actual en registro: {material['current_stock']}")

    # 2. Buscar items en tickets que estén 'pending' o 'processing' para este material
    # La validación del frontend dice: "pending in other requests".
    # Esto ocurre cuando hay items en status 'pending' o tickets abiertos.
    
    print("\nBuscando items pendientes...")
    
    # Buscamos en ticket_items
    # Asumiendo que tickets 'active' o 'processing' son los que cuentan.
    # O items con status específico. Reurdo que el sistema calcula stock disponible restando los pedidos.
    
    # Consultar ticket_items que NO estén (cancelled, fulfilled)
    # y ver a qué ticket pertenecen.
    
    items_res = supabase.from_('ticket_items')\
        .select('id, ticket_id, quantity_requested, status, tickets(folio, status)')\
        .eq('material_id', material_id)\
        .execute()
        
    pending_items = []
    
    for item in items_res.data:
        # Filtrar lógica de "pendiente"
        # Generalmente si el item no está 'cancelled' ni 'fulfilled', cuenta como pedido activo.
        # O si el ticket está abierto.
        
        status = item.get('status')
        ticket_status = item.get('tickets', {}).get('status')
        
        print(f"Item {item['id']} (Ticket {item['tickets']['folio']}): Status Item='{status}', Status Ticket='{ticket_status}', Qty={item['quantity_requested']}")
        
        if status not in ['cancelled', 'fulfilled']:
             pending_items.append(item)

    print(f"\nTotal items detectados como pendientes/activos: {len(pending_items)}")

    if not pending_items:
        print("No se encontraron items pendientes que expliquen el bloqueo. Verificando lógica de stock...")
    else:
        print("Se encontraron los siguientes items bloqueando el stock:")
        for item in pending_items:
            print(f" - Item {item['id']} en Ticket {item['tickets']['folio']} (Qty: {item['quantity_requested']})")
            
        # 3. Corregir (Cancelar)
        confirm = input("\n¿Deseas CANCELAR estos items para liberar el stock? (s/n): ")
        if confirm.lower() == 's':
            ids_to_cancel = [i['id'] for i in pending_items]
            
            print(f"Cancelando items: {ids_to_cancel}...")
            
            update_res = supabase.from_('ticket_items')\
                .update({'status': 'cancelled'})\
                .in_('id', ids_to_cancel)\
                .execute()
                
            print("Items actualizados a 'cancelled'.")
            print("Resultado:", update_res.data)
            
            # Opcional: Actualizar el ticket a 'closed' o 'cancelled' si todos sus items están cancelados?
            # Por seguridad, solo cancelo los items del material problemático.
            
        else:
            print("Operación cancelada por el usuario.")

if __name__ == "__main__":
    asyncio.run(main())
