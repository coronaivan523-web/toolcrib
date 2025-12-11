from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.inventory import Material, InventoryMovement, MovementType
from app.schemas.inventory_movement import InventoryMovementCreate

class InventoryService:
    @staticmethod
    def create_movement(db: Session, movement_in: InventoryMovementCreate, user_id: int) -> InventoryMovement:
        """
        Registra un movimiento de inventario y actualiza el stock del material de forma transaccional.
        """
        # 1. Validar existencia del material
        material = db.query(Material).filter(Material.id == movement_in.material_id).with_for_update().first()
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")

        # 2. Validar cantidad positiva
        if movement_in.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")

        # 3. Calcular impacto en stock según tipo de movimiento
        stock_change = 0
        if movement_in.movement_type in [MovementType.IN, MovementType.RETURN, MovementType.ADJUSTMENT_POS]:
            stock_change = movement_in.quantity
        elif movement_in.movement_type in [MovementType.OUT, MovementType.ADJUSTMENT_NEG]:
            stock_change = -movement_in.quantity
        
        # 4. Validar stock suficiente para salidas
        new_stock = material.current_stock + stock_change
        if new_stock < 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock. Current: {material.current_stock}, Requested: {movement_in.quantity}"
            )

        # 5. Crear registro de movimiento
        movement = InventoryMovement(
            material_id=movement_in.material_id,
            movement_type=movement_in.movement_type,
            quantity=movement_in.quantity,
            user_id=user_id,
            reference_type=movement_in.reference_type,
            reference_id=movement_in.reference_id,
            notes=movement_in.notes
        )
        db.add(movement)

        # 6. Actualizar stock del material
        material.current_stock = new_stock
        db.add(material)
        
        # Nota: El commit se debe hacer en el controlador o capa superior para atomicidad completa si hay más pasos
        db.commit()
        db.refresh(movement)
        
        return movement
