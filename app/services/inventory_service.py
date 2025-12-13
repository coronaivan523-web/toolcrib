from fastapi import HTTPException
from app.core.supabase import supabase, supabase_admin

class InventoryService:
    @staticmethod
    def create_movement(movement_in: InventoryMovementCreate, user_id: str):
        """
        Register inventory movement and update stock using Supabase.
        Ideally this should be a Supabase Database Function (RPC) for atomicity.
        Here we implement client-side logic.
        """
        if not supabase_admin:
            raise HTTPException(status_code=500, detail="Service Role Key required for inventory operations")

        # 1. Validate material existence
        # Can use standard client to read if public/auth user has read access, but admin is safer
        res = supabase_admin.table('materials').select('*').eq('id', movement_in.material_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Material not found")
        material = res.data
        
        # 2. Validate positive quantity
        if movement_in.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")

        # 3. Calculate stock change
        stock_change = 0
        m_type = movement_in.movement_type
        if m_type in ["IN", "RETURN", "ADJUSTMENT_POS"]:
            stock_change = movement_in.quantity
        elif m_type in ["OUT", "ADJUSTMENT_NEG"]:
            stock_change = -movement_in.quantity
        
        # 4. Validate sufficient stock
        current_stock = material['current_stock']
        new_stock = current_stock + stock_change
        
        if new_stock < 0:
             raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock. Current: {current_stock}, Requested: {movement_in.quantity}"
            )

        # 5. Create Movement Record
        movement_data = {
            "material_id": movement_in.material_id,
            "movement_type": m_type,
            "quantity": movement_in.quantity,
            "user_id": user_id,
            "reference_type": movement_in.reference_type,
            "reference_id": movement_in.reference_id,
            "notes": movement_in.notes
        }
        
        move_res = supabase_admin.table('inventory_movements').insert(movement_data).execute()
        if not move_res.data:
            raise HTTPException(status_code=500, detail="Failed to create movement record")
        
        created_movement = move_res.data[0]
        
        # 6. Update Material Stock
        supabase_admin.table('materials').update({"current_stock": new_stock}).eq('id', movement_in.material_id).execute()
        
        return created_movement
