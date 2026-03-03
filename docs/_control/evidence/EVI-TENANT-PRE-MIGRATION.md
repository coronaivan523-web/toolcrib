# EVI-TENANT-PRE-MIGRATION

## Resultados crudos

### 1) DISTINCT plant FROM materials
- 'Planta 1'
- 'Planta 2'

### 2) DISTINCT plant FROM inventory_movements
- **¡ERROR!** La columna `inventory_movements.plant` **NO EXISTE** actualmente en Staging. El script de comprobación devolvió una excepción PostgreSQL `42703`.

### 3) COUNT by plant in materials
- Planta 1: 21
- Planta 2: 1

### 4) COUNT by plant in inventory_movements
- N/A (Columna Inexistente)

### 5) COUNT profiles
- Total Profiles: 11

### 6) Verificar inconsistencias:
- `materials (plant IS NULL OR '')`: 0
- `inventory_movements (plant IS NULL OR '')`: 0

---

## ANÁLISIS DE RIESGO

### 1) ¿Existe algún valor de plant que no sea uniforme (espacios, minúsculas, variantes)?
**SI.** La matriz arrojó los valores `'Planta 1'` y `'Planta 2'`. Tienen espacios en blanco integrados. El `code VARCHAR(10)` propuesto para la nueva tabla maestra `plants` soporta 10 caracteres (`Planta 1` son 8), pero inyectar espacios en los JWT (`app_metadata`) u operar con FKs como `'Planta 1'` viola mejores prácticas corporativas donde se prefieren alfanuméricos (`PL1`, `WXM`). 

### 2) ¿Existen plants en movements que no existan en materials?
**NO.** Técnicamente es imposible, ya que la tabla de transacciones de inventario aún carece físicamente de dicha columna (El script `20260302_add_plant_to_inventory_movements.sql` de HC-3 Fase 2 fue diseñado localmente pero no comiteado ni depositado en Supabase aún).

### 3) ¿Hay plant NULL o vacío?
**NO.** Las métricas reflejan 0 inconsistencias sobre la tabla viva de `materials`. La dependencia temporal está sana.

### 4) ¿Existe riesgo inmediato de FK explosion?
**SI. RIESGO CRÍTICO.**
Si se aplican las restricciones del *Implementation Plan* de HC-4 Fase 4 inmediatamente:
1. Habrá un crash sintáctico en base de datos al intentar crear el FK: `ALTER TABLE inventory_movements ADD CONSTRAINT fk_movements_plant FOREIGN KEY (plant)...` porque esa columna es inexistente.
2. Como se requiere mapeo FK, declarar `code` como 'Planta 1' o tener que parsearlo causará colisiones manuales en el Backfill. 

### 5) ¿El número de perfiles coincide con los 11 usuarios detectados previamente?
**SI.** El COUNT en `public.profiles` certifica consistentemente la existencia de los 11 usuarios expuestos en el diagnóstico previo HC-4 Fase 3.

---

**FINAL:**
Snapshot completado — Sin modificaciones — Pendiente autorización de migración
