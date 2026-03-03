# EVI-HC3-02-MULTIPLANT-STRUCTURE

## 1. Fase 0: Preflight (Auditoría Staging)

- **`materials`:** Posee actualmente columna `plant (text)`.
- **`plant_id` estructural:** Inexistente. El modelo actual está construido por entero sobre campos texto `plant` inyectados ("Planta 1"). No hay tabla `plants`.
- **`inventory_movements`:** Carecía de columna transaccional aislada `plant`, dejándola huérfana y limitando gravemente el aislamiento de inquilinos (tenant-isolation) en base de datos.
 
## 2. Fase 1: Modificación de Base de Datos
Se emitió el archivo local de migración `supabase/migrations/20260302_add_plant_to_inventory_movements.sql`.

**Componentes y Script Completo:**
1. **Adición DDL:** `ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS plant text;`
2. **Backfill Interlocking (Transaccional):** 
```sql
UPDATE public.inventory_movements im
SET plant = m.plant
FROM public.materials m
WHERE im.material_id = m.id
  AND im.plant IS NULL;
```
3. **Limitante Constraint:** El comando `ALTER COLUMN plant SET NOT NULL` queda documentado pasivamente en el script para ser aplicado *exclusivamente* por SysAdmin una vez se constate que los registros regresan `null_plants = 0`. Esto obedece a la política de no ejecutar bloqueos destructivos automáticos sobre datos en caliente (Backfill Parcial).

## 3. Fase 2: Alineación Backend

Se intervinieron y reestructuraron las dos fuentes primarias de inyección a los historiales de Kardex para asegurar derivación nativa sin fiarse del Payload (evitando vulnerabilidad de inyección JWT desordenada):

- **Archivos Modificados:**
  1. `supabase/migrations/20260302_atomic_inventory_movement_v1.sql` (Vía de REST API nativa y Toolcrib operations).
  2. `supabase/migrations/20260302_add_plant_to_inventory_movements.sql` (Anexa actualización forzosa al RPC aislado `confirm_initial_inventory`).

- **Regla Garantizada:** El RPC efectúa en una sola transacción PostgreSQL: `RETURNING current_stock, plant INTO v_new_stock, v_plant;` proveniente de la base central de datos (`materials`) y lo inyecta incondicionalmente al INSERT colindante (`inventory_movements`). Ninguna transacción backend podrá bypassear esta herencia atómica de la Planta padre.

## 4. Fase 3: Operaciones Finales en STAGING

**Procedimiento Oficial para Control Room:**
La ejecución de la instrucción de confirmación debe arrojar `0`:
```sql
SELECT COUNT(*) AS null_plants FROM inventory_movements WHERE plant IS NULL;
```

**Confirmación General:**
Todos los artefactos DB y código SQL han sido provistos para ejecutar la inyección en **STAGING ONLY**.
Rama Activa: `feature/hardening-core-v2`.
