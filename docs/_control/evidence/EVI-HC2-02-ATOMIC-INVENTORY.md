# EVI-HC2-02-ATOMIC-INVENTORY

## 1. Archivos Modificados
- `supabase/migrations/20260302_atomic_inventory_movement_v1.sql` (NUEVO)
- `app/services/inventory_service.py`
- `app/services/cycle_count_service.py`

## 2. Antes vs Después

### Patrón Eliminado (Inseguro - Read-Modify-Write / Write Ciego)
Anteriormente, los servicios leían el stock hacia Python, sumaban y enviaban un Update ciego directo.
```python
# ANTES
current_stock = material['current_stock']
new_stock = current_stock + stock_change
supabase_admin.table('materials').update({"current_stock": new_stock}).eq('id', movement_in.material_id).execute()
```

### Patrón Implementado (Atómico de Base de Datos)
Tanto la creación normal de inventario (`create_movement`) como los ajustes cíclicos (`commit_line`) delegan completamente la matemática e inyección estructural a un Procedimiento Almacenado transaccional en PostgreSQL.
```python
# DESPUÉS (En Python)
result = client.rpc(
    "atomic_inventory_movement_v1",
    {
        "p_material_id": material_id,
        "p_delta": delta,
        "p_user_id": performer_id,
        "p_reason": reason_str
    }
).execute()
```

## 3. Código SQL del RPC Atómico (Migración)
```sql
CREATE OR REPLACE FUNCTION atomic_inventory_movement_v1(
    p_material_id bigint,
    p_delta integer,
    p_user_id uuid,
    p_reason text
)
RETURNS TABLE(new_stock integer)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_stock integer;
BEGIN
    UPDATE materials
    SET current_stock = current_stock + p_delta
    WHERE id = p_material_id
    RETURNING current_stock INTO v_new_stock;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material not found';
    END IF;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    INSERT INTO inventory_movements(
        material_id,
        quantity,
        movement_type,
        user_id,
        notes,
        created_at
    )
    VALUES (
        p_material_id,
        ABS(p_delta),
        CASE WHEN p_delta >= 0 THEN 'IN' ELSE 'OUT' END,
        p_user_id,
        p_reason,
        now()
    );

    RETURN QUERY SELECT v_new_stock;
END;
$$;
```

## 4. Confirmaciones
- [x] **Confirmación de RMW**: Se ejecutó un rastreo integral sobre el código base utilizando comandos `grep` regulares sobre la carpeta `app/`. No existen instancias sobrevivientes de mutación explícita (e.g. `.update({"current_stock"`) proveniente de cálculos desacoplados.
- [x] **Confirmación Mutación Vía RPC**: La única vía de alterar activamente el stock está encapsulada a niveles de PostgreSQL (`execute()` invocando el proxy `atomic_inventory_movement_v1`).
- [x] Rama Aislada: Todos los cambios subyacentes se aplicaron única y exclusivamente sobre `feature/hardening-core-v2`.
