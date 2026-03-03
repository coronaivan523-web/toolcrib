# PLAN CONSOLIDACIÓN PLANT INVENTARIO

## FASE A — DIAGNÓSTICO RELACIONAL

1. **Confirmación de Referencia a `materials`:**
   Sí. Históricamente y por diseño atómico, la tabla `inventory_movements` se adhiere fuertemente a `materials` mediante la columna `material_id`. Esta relación es el eje troncal que asocia las transacciones atómicas (`IN`/`OUT`) con el catálogo de herramientas y refacciones corporativas.

2. **Relación Movimientos-Materiales:**
   Es una asociación transaccional `1:N` (Un Material tiene muchos Movimientos). Debido a que `materials` ya contiene la columna `plant` textualmente segregada, cada movimiento insertado a partir de cierta fecha es inherentemente atribuible a dicha planta base. Lo único faltante es denormalizar esta columna hacia la bitácora de movimientos para encapsular el RLS nativo per-tabla.

---

## FASE B — PROPUESTA CONTROLADA

### SQL Draft

```sql
-- 1) Inyección Segura de Columna DDL 
-- Tipo VARCHAR(50) prepara el campo para la futura estabilización de Códigos Alfanuméricos (Tenant Model)
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS plant VARCHAR(50);

-- 2) Consolidación DML (Backfill Controlado)
-- Propaga la planta matriz desde el catálogo hacia el histórico completo de transacciones
UPDATE public.inventory_movements im
SET plant = m.plant
FROM public.materials m
WHERE im.material_id = m.id
  AND im.plant IS NULL;

-- 3) Validación de Éxito (Audit Select)
-- Solo cuando este conteo arroje ZERO se podrá considerar al RLS 100% blindado
SELECT COUNT(*) 
FROM public.inventory_movements 
WHERE plant IS NULL OR plant = '';
```

### Orden Seguro de Ejecución
Debe orquestarse estrictamente de forma lineal, dentro de bloque transaccional o scripts secuenciales evaluados:
1.  **Bloqueo de Escrituras (Opcional pero Recomendado):** Advertir a la aplicación sobre ventanas de mantenimiento breves si el volumen supera las decenas de miles de filas. (En staging con <100 registros, la inyección es sub-milisegundo).
2.  Despliegue del `ALTER TABLE` (Paso 1).
3.  Despliegue del `UPDATE` de Backfill (Paso 2).
4.  Comprobación visual del `SELECT COUNT(*)` (Paso 3).
5.  *Punto de No Retorno:* A futuro, si el recuento es cero, aplicar constrain `ALTER COLUMN plant SET NOT NULL`.

### Riesgos
- **Bloqueo RLS Accidental**: Si se añade la directiva `NOT NULL` en la misma transacción junto a un RLS agresivo, la base de datos abortará cualquier nuevo insert de clientes antiguos/proxies que aún no expongan la planta `plant` forjada en el código backend.
- **Sobrescritura:** El uso de `AND im.plant IS NULL` funge como salvaguarda; si se omite, un backfill en ambientes vivos podría destruir plantas registradas asíncronamente en operaciones recientes.

### Plan de Rollback
Ante una emergencia extrema de corrupción referencial, la reversión en Stage se compone de una demolición directa de la columna, lo cual es no-bloqueante para clientes legados que de por sí ignoraban este campo:
```sql
-- ROLLBACK COMMAND
ALTER TABLE public.inventory_movements DROP COLUMN IF EXISTS plant;
```
