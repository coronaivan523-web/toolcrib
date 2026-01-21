import json
from datetime import date
from uuid import uuid4

# Simulación de la lógica corregida
def simulate_create_session(payload):
    print(f"Payload original: {payload}")
    
    # Lógica aplicada en cycle_count_service.py
    if payload.get('count_date'):
        payload['count_date'] = payload['count_date'].isoformat()
        
    print(f"Payload transformado: {payload}")
    
    try:
        # Esto simula lo que hace supabase-py internamente (json.dumps)
        json_str = json.dumps(payload)
        print("Éxito: El payload se serializó correctamente a JSON.")
        print(f"JSON Output: {json_str}")
    except TypeError as e:
        print(f"Error: Falló la serialización - {e}")

if __name__ == "__main__":
    # Caso de prueba con objeto date
    test_payload = {
        "count_date": date.today(),
        "created_by": str(uuid4()),
        "status": "DRAFT"
    }
    simulate_create_session(test_payload)
