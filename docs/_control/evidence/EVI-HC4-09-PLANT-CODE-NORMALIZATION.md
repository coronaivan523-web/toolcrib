# EVI-HC4-09-PLANT-CODE-NORMALIZATION

## MAPEO CONFIRMADO POR HUMANO (CERRADO)
- `'Planta 1'` -> `'MX-GUA-SIL-PI-P01'` (Silao, Puerto Interior P1)
- `'Planta 2'` -> `'MX-GUA-SIL-PI-P02'` (Silao, Puerto Interior P2)

---

## BLOQUE SQL (PARA SUPABASE SQL EDITOR - STAGING)

```sql
-- =========================================================================
-- HC-4 NORMALIZACIÓN DE PLANT CODES (MX GUA)
-- ENTORNO: STAGING
-- FAIL-CLOSED: Con aserciones estrictas para evitar registros huérfanos
-- =========================================================================

-- =============================================
-- FASE 1: PRE-CHECK VISUAL
-- =============================================
SELECT 'PRE-CHECK MATERIALS' AS check_type, plant, COUNT(*) 
FROM public.materials GROUP BY plant ORDER BY 2 DESC;

SELECT 'PRE-CHECK MOVEMENTS' AS check_type, plant, COUNT(*) 
FROM public.inventory_movements GROUP BY plant ORDER BY 2 DESC;

-- =============================================
-- FASE 2: DML SEGURO Y TRANSACCIONAL
-- =============================================
DO $$
DECLARE
    v_unmapped_materials INT;
    v_unmapped_movements INT;
    v_invalid_prestaging INT;
BEGIN
    ---------- GUARDAS PRE-MIGRACIÓN ----------
    -- Confirmar que no existen strings alienígenas antes de empezar
    SELECT COUNT(*) INTO v_invalid_prestaging 
    FROM public.materials 
    WHERE plant NOT IN ('Planta 1', 'Planta 2') AND plant NOT LIKE 'MX-GUA-%';
    
    IF v_invalid_prestaging > 0 THEN
       RAISE EXCEPTION 'ABORTANDO (PRECHECK): Se encontró % plant(s) en materials que no son Planta 1/2 ni MX-GUA.', v_invalid_prestaging;
    END IF;

    ---------- MIGRACIÓN DML ----------
    -- 1. Normalizar Materials
    UPDATE public.materials
    SET plant = CASE 
        WHEN plant = 'Planta 1' THEN 'MX-GUA-SIL-PI-P01'
        WHEN plant = 'Planta 2' THEN 'MX-GUA-SIL-PI-P02'
        ELSE plant 
    END
    WHERE plant IN ('Planta 1', 'Planta 2');

    -- 2. Normalizar Inventory Movements
    UPDATE public.inventory_movements
    SET plant = CASE 
        WHEN plant = 'Planta 1' THEN 'MX-GUA-SIL-PI-P01'
        WHEN plant = 'Planta 2' THEN 'MX-GUA-SIL-PI-P02'
        ELSE plant 
    END
    WHERE plant IN ('Planta 1', 'Planta 2');

    ---------- FASE 3: VALIDACIÓN FAIL-CLOSED (ASSERT) ----------
    -- Asegurar matemáticamente que toda la base de datos es ahora 100% canónica
    SELECT COUNT(*) INTO v_unmapped_materials 
    FROM public.materials 
    WHERE plant NOT LIKE 'MX-GUA-%';
    
    SELECT COUNT(*) INTO v_unmapped_movements 
    FROM public.inventory_movements 
    WHERE plant NOT LIKE 'MX-GUA-%';

    IF v_unmapped_materials > 0 OR v_unmapped_movements > 0 THEN
        RAISE EXCEPTION '-----------> ABORTO CRÍTICO <-----------: Quedaron % materiales y % movimientos huérfanos (No encajan con MX-GUA). TRANSACCIÓN REVERTIDA AUTOMÁTICAMENTE.', v_unmapped_materials, v_unmapped_movements;
    END IF;

END $$;

-- =============================================
-- FASE 4: POST-CHECK VISUAL (EVIDENCIA)
-- =============================================
SELECT 'POST-CHECK MATERIALS' AS check_type, plant, COUNT(*) 
FROM public.materials GROUP BY plant ORDER BY 2 DESC;

SELECT 'POST-CHECK MOVEMENTS' AS check_type, plant, COUNT(*) 
FROM public.inventory_movements GROUP BY plant ORDER BY 2 DESC;
```

---

## CHECKLIST EVIDENCIA (A COMPLETAR POR OPERADOR)

- [ ] **Mapeo Integrado:** El script SQL refleja exactamente `Planta 1 -> MX-GUA-SIL-PI-P01` y `Planta 2 -> MX-GUA-SIL-PI-P02`.
- [ ] **Pre-Check Exitoso:** Los recuentos iniciales reflejan la composición legada prevista (Ningún string malformado extraterrestre).
- [ ] **DML Bloque Terminado:** El bloque `DO $$` se ejecutó en el *SQL Editor* **sin** devolver excepciones.
- [ ] **Asserts Respetados:** PostgreSQL completó el bloque transaccional demostrando que NINGÚN registro contraviene el regex `MX-GUA-%`.
- [ ] **Post-Check Exitoso:** Tablas completas han migrado hacia su Plant Code neutral de facto.
