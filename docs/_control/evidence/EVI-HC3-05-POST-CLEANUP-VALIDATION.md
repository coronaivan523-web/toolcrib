# EVI-HC3-05-POST-CLEANUP-VALIDATION

## 1) CONTEXTO / PRECHECK
- **Proyecto Activo:** DESCONOCIDO. Al operar bajo el protocolo restringido del agente local, no poseo interfaz de ejecución SQL cruda conectada directamente a la instancia Staging de Supabase PostgREST (inexistencia de API pública pasante).
- **Rama Actual:** `feature/hardening-core-v2` (Local).

## 2) VALIDACIÓN DB (READ-ONLY)
**Aviso Fail-Closed:** *Al carecer de inyector directo al Supabase SQL Editor para consultas puras (`pg_policies`, `information_schema`), todas las validaciones estructurales de base de datos se reportan sin evidencia en terminal local.*

- A) Listar políticas actuales: REQUIERE EJECUCIÓN MANUAL
- B) Confirmar eliminación permisivas: REQUIERE EJECUCIÓN MANUAL
- C) Confirmar RLS habilitado: REQUIERE EJECUCIÓN MANUAL
- D) Confirmar `plant` en `inventory_movements`: REQUIERE EJECUCIÓN MANUAL
- E) Confirmar RPCs atómicos: REQUIERE EJECUCIÓN MANUAL

## 3) VALIDACIÓN CÓDIGO (READ-ONLY)

Escrutinio global de repositorio local para firmas vulnerables e interactivas:

- **`SUPABASE_SERVICE_KEY`:** 
  - **Runtime:** `app/core/config.py`, `app/core/supabase.py`, `app/api/v1/endpoints/users.py`, `app/services/requisition_service.py` (Flujo vivo).
  - **Docs/Backups:** Extensivo en `_backups/legacy_scripts/` y docs de evidencia.
- **`service_role`:**
  - **Runtime (Migraciones DB):** Utilizado en iteraciones históricas como `GRANT EXECUTE ON FUNCTION... TO service_role` en `20260128_add_employee_number.sql` y anexos.
  - **Runtime (Python):** `app/core/config.py` (Descripciones).
- **`supabase_admin`:**
  - **Runtime:** `app/core/supabase.py` (Inicialización del singleton cliente con bypass de políticas), Inyectado activamente en los controladores `app/api/v1/endpoints/materials.py` (para lectura total de inventario evadiendo el RLS viejo) y `app/api/v1/endpoints/inventory.py`.
- **`Enable read access for all users`:** 
  - Solo encontrado a lo largo del historial de migraciones de base de datos dentro de sentencias `DROP POLICY IF EXISTS`. No existen inyecciones directas de dicha regla de seguridad en las sentencias de string Python.

## 4) RESULTADO FAIL-CLOSED (TABLA MATRIZ)

| Check | Evidencia | PASS/FAIL | Riesgo |
|---|---|---|---|
| A) Contexto de Staging/Project REF | Ausente en ejecución de bot local. | **FAIL (NO-GO)** | Desconocido (Operación a ciegas) |
| B) Purgado de Permisivas RLS (`pg_policies`) | Ausente en DB viva, solo confirmada la creación de los scripts DDL SQL. | **FAIL (NO-GO)** | ALTO (Fuga de datos intencional o accidental multi-planta si el script falla al operar en remoto). |
| C) RLS Mandatory `pg_class` | Ausente en DB viva. | **FAIL (NO-GO)** | ALTO (Mutaciones indiscriminadas en Kardex). |
| D) Constraint `plant` Transaccional | Ausente en DB viva. | **FAIL (NO-GO)** | ALTO (Inyección de datos corruptos sin planta asociada). |
| E) RPC Structure `pg_proc` | Ausente en DB viva. | **FAIL (NO-GO)** | ALTO (Riesgo transaccional interbloqueos si se degrada el update DB). |
| F) Limpieza `SERVICE_ROLE` Backends | Código escaneado: Persisten inyecciones `supabase_admin` transaccionales. | **WARN (NO-GO)** | EXTREMO (El bypass total rinde estéril el 100% las nuevas políticas RLS Multi-planta escritas en el Step Anterior). |

### VEREDICTO FINAL: NO-GO ⛔
El entorno local ha detectado que **todavía existen fuertes dependencias del `service_role`** (`supabase_admin`) en las rutas base de la API y carece de confirmación explícita sobre el impacto de la migración de DB. Se bloquea terminantemente avanzar a la Fase de Enforcement integral de Tenant/Roles de HC-3 hasta subsanar el bypass.

**Se Requiere:** Ejecutar las queries listadas nativamente por parte del Administrador (Supabase GUI) y suprimir la dependencia transaccional al Service Key en `materials.py` y `inventory.py`.
