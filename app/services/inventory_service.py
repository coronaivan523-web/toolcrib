from fastapi import HTTPException
from app.core.config import settings
from supabase import create_client, ClientOptions
from app.schemas.inventory import InventoryMovementCreate
import base64, json
from datetime import datetime
from typing import Any

class InventoryService:
    @staticmethod
    def get_user_client(token: str):
        try:
            payload = token.split('.')[1]
            payload += '=' * (-len(payload) % 4)
            claims = json.loads(base64.b64decode(payload).decode('utf-8'))
            plant = claims.get('app_metadata', {}).get('plant') or claims.get('user_metadata', {}).get('plant') or claims.get('plant')
            if not plant:
                 raise HTTPException(status_code=403, detail="Missing 'plant' claim in JWT")
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=403, detail="Missing 'plant' claim in JWT")
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options=ClientOptions(headers={'Authorization': f'Bearer {token}'}))

    @staticmethod
    def create_movement(movement_in: InventoryMovementCreate, current_user: Any):
        """
        Register inventory movement and update stock using Supabase.
        HC-2: Refactored to use ATOMIC RPC for 100% guarantee against race conditions.
        HC-3: Using JWT client bound to plant claim.
        """
        user_id = str(current_user.id)
        client = InventoryService.get_user_client(current_user.token)

        # 1. Validate positive quantity
        if movement_in.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")

        # 2. Calculate stock change (Signed Delta)
        stock_change = 0
        m_type = movement_in.movement_type
        if m_type in ["IN", "RETURN", "ADJUSTMENT_POS"]:
            stock_change = movement_in.quantity
        elif m_type in ["OUT", "ADJUSTMENT_NEG"]:
            stock_change = -movement_in.quantity
            
        reason_str = movement_in.notes or f"{m_type} {movement_in.reference_type or ''} {movement_in.reference_id or ''}"

        # 3. ATOMIC DELEGATION TO POSTGRESQL (Execute RMW Transactionally)
        try:
            result = client.rpc(
                "atomic_inventory_movement_v1",
                {
                    "p_material_id": movement_in.material_id,
                    "p_delta": stock_change,
                    "p_user_id": user_id,
                    "p_reason": reason_str
                }
            ).execute()
        except Exception as e:
            err_msg = str(e)
            if 'Insufficient stock' in err_msg:
                 raise HTTPException(status_code=400, detail="Insufficient stock to satisfy this movement.")
            elif 'Material not found' in err_msg:
                 raise HTTPException(status_code=404, detail="Material not found")
            else:
                 # Propagar 400 con mensaje controlado
                 print(f"[ERROR] RPC atomic_inventory_movement_v1 failed: {e}")
                 raise HTTPException(status_code=400, detail=f"Database atomic transaction rejected: {e}")
            
        # 4. Shadow Ledger
        idempotency_key = f"{movement_in.reference_type or 'MANUAL'}:{movement_in.material_id}:{stock_change}:{user_id}:{datetime.now().timestamp()}"
        
        try:
            client.rpc('process_ledger_movement', {
                'p_payload': {
                    'material_id': movement_in.material_id,
                    'movement_type': m_type,
                    'quantity': stock_change,
                    'reference_type': movement_in.reference_type or 'MANUAL',
                    'reference_id': str(movement_in.reference_id or ''),
                    'idempotency_key': idempotency_key,
                    'created_by': user_id,
                    'metadata': {"shadow_mode": True, "atomic_v1": True}
                }
            }).execute()
        except Exception as e:
            print(f"[SHADOW MODE ERROR] process_ledger_movement failed: {e}")
            
        # Due to RPC replacing the standard REST insertion, we return a mock compatible object to the router
        # Since the standard router expects an object with 'id', we simulate it. The real transaction succeeded.
        return {
            "id": 0, # Placeholder, true id is inside DB
            "material_id": movement_in.material_id,
            "movement_type": m_type,
            "quantity": movement_in.quantity,
            "user_id": user_id,
        }
