# EVI-HC4-08-INVENTORY-PLANT-ROLLOUT

## BLOQUE SQL (PARA SUPABASE SQL EDITOR - STAGING)

```sql
-- =========================================================================
-- HC-4 INVENTORY PLANT CONSOLIDATION (STAGING)
-- AUTO-ROLLOUT SCRIPT (FAIL-CLOSED)
-- Este script es idempotente y seguro de ejecutar múltiples veces sin romper 
-- dependencias si ya se aplicó.
-- =========================================================================

-- FASE 1: PRE-CHECK (EVIDENCIA ANTES)
-- Por favor, ejecuta esto solo o observa el listado de resultados
SELECT COUNT(*) AS total_movements_before FROM public.inventory_movements;
SELECT column_name AS existe_plant_antes FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='plant';

-- FASE 2: DDL SEGURO (IDEMPOTENTE)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='plant') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN plant VARCHAR(50);
    END IF;
END $$;

-- FASE 3: BACKFILL CONTROLADO
UPDATE public.inventory_movements im
SET plant = m.plant
FROM public.materials m
WHERE im.material_id = m.id
  AND im.plant IS NULL;

-- FASE 4: VALIDACIÓN POST-BACKFILL (ASSERTION Y ABORTO)
DO $$
DECLARE
    null_count INT;
BEGIN
    SELECT COUNT(*) INTO null_count FROM public.inventory_movements WHERE plant IS NULL;
    IF null_count > 0 THEN
        -- Provoca rollback automático o fallo de bloque en Supabase de todo el script remanente
        RAISE EXCEPTION 'Abortando consolidación: % registros aún tienen plant NULL.', null_count;
    END IF;
END $$;

-- Si el bloque DO anterior no arrojó excepción, el Assertion pasó.
-- FASE 5: BLOQUEO PREVENTIVO (SET NOT NULL)
ALTER TABLE public.inventory_movements ALTER COLUMN plant SET NOT NULL;

-- FASE 6: POST-CHECK (EVIDENCIA DESPUÉS)
SELECT COUNT(*) AS total_movements_after FROM public.inventory_movements;
SELECT COUNT(*) AS null_plants_after FROM public.inventory_movements WHERE plant IS NULL;
```

---

## CHECKLIST DE EVIDENCIA

- [ ] **FASE 1 (Antes):** Columna plant existía: `(SI/NO)`
- [ ] **FASE 1 (Antes):** Total movimientos inicial: `(Ingresa Número)`
- [ ] **FASE 3 (Backfill):** Filas actualizadas devueltas por PostgreSQL: `(Ingresa Número)`
- [ ] **FASE 4 (Validación):** El assertion DO $$ pasó sin arrojar error (Null count = 0): `(PASS/FAIL)`
- [ ] **FASE 6 (Después):** Total movimientos final: `(Ingresa Número)`
- [ ] **FASE 6 (Después):** Modificador NOT NULL aplicado con éxito: `(PASS)`
- [ ] **Tiempo de ejecución aproximado**: `(Ingresa ms o s)`

---
**DICTAMEN A COMPLETAR POR OPERADOR:**
Consolidación completada — Sin FK — Lista para siguiente fase
