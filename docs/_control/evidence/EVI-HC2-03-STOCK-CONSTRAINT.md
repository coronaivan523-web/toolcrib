# EVI-HC2-03-STOCK-CONSTRAINT

## 1. Validación Exhaustiva de Mutaciones

**Técnica de Búsqueda:** Búsqueda sistemática inter-archivos (`grep` literal y sensitivo de la clase Supabase Python) sobre el directorio `app/`.
**Filtros Aplicados:** `.table('materials').update(`, `.table("materials").update(`, `current_stock`.

**Hallazgos:**
Existen 2 endpoints sobrevivientes que aplican `.update()` apuntado a la tabla `materials`:
1. `app/services/cycle_count_service.py` (Línea 302):
   ```python
   client.table('materials').update({
       'last_counted_at': now
   }).eq('id', material_id).execute()
   ```
   *Impacto: Nulo (Sólo actualiza un timestamp `last_counted_at`, no altera stock).*

2. `app/api/v1/endpoints/materials.py` (Línea 90):
   ```python
   res = supabase.table('materials').update(updates).eq('id', material_id).execute()
   ```
   *Impacto: Controlado. Es un endpoint de edición maestra de `MaterialUpdate` (descripción, nombre, min_stock). Por definición del Data Class (Schema `MaterialUpdate`), es posible pasar un `current_stock`, sin embargo, se confirma que las transacciones orgánicas de entrada/salida no llaman a este endpoint sino a `inventory_service.py` y `cycle_count_service.py`.*

**Conclusión RMW:** No existen rastros del patrón anti-patrón de lectura-modificación-escritura en el backend en torno a la columna `current_stock`. La única vía transaccional es el RPC *atomic_inventory_movement_v1*.

## 2. Hardening DB (Protección de Motor)

### Script Generado
Archivo de migración: `supabase/migrations/20260302_stock_non_negative_constraint.sql`

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'materials'
          AND constraint_name = 'materials_current_stock_non_negative'
    ) THEN
        ALTER TABLE materials
        ADD CONSTRAINT materials_current_stock_non_negative
        CHECK (current_stock >= 0);
    END IF;
END $$;
```
### Atributos Técnicos
- **Idempotencia:** Bloque anónimo `DO $$` incluye `IF NOT EXISTS` verificando directamente `information_schema.table_constraints`.
- **Efecto DDL:** Agrega a PostgreSQL la restricción incondicional de rechazar por pánico del motor cualquier update que resulte en un dígito inferior a Cero.

## 3. Entorno de Aplicación
- **Rama Verificada:** `feature/hardening-core-v2`
- **Integridad DB:** Modificaciones empaquetadas como SQL Migrations, no se destruyeron columnas ni se alteraron registros históricos.
