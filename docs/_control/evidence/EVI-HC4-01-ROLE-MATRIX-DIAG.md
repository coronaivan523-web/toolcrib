# EVI-HC4-01-ROLE-MATRIX-DIAG (FASE 1)

## PRE-REPORTE (FAIL-CLOSED)
Las consultas ejecutadas directamente en base de datos (`pg_policies`, `pg_class`, `pg_proc`, `information_schema.columns`) requeridas en el Prompt marcaron **NO-GO** de entorno ya que el Agente Local carece de CLI conectado a Staging Postgres. 

La matriz se reconstruyó estáticamente mediante lectura profunda del repositorio (`feature/hardening-core-v2`), parseando las definiciones DDL de esquemas/funciones y los controladores FastApi.

---

## T1) Role Sources (Identidad y Autorización)

| Fuente | Campo Exacto | Archivo/Función | Riesgo |
|---|---|---|---|
| JWT Metadata | `user_metadata.get('role')` | `app/core/deps.py:35` (`get_current_active_user`) | **ALTO**. El JWT puede caducar en Supabase sin refrescar el rol si cambia en DB de repente (Stale Token). |
| Consulta SQL a DB | `role` (table: `profiles`) | `app/services/requisition_service.py:531` | **MEDIO**. Evita tokens sucios, PERO la consulta evade RLS al emplear transaccionalmente al `supabase_admin` (Fallo perimetral detectado). |
| JWT App/User Meta | `plant` | `inventory_service.py` / `materials.py` | **BAJO**. Está validado estáticamente con abort 403. |
| DB / RLS (Duro) | `auth.jwt()->>'plant'` | Migraciones HC-3.0 (`20260302_rls_hardening_multi_plant.sql`) | **BAJO**. Ejecución en PostgreSQL C. |

---

## T2) Endpoint Role Gates (Vulnerabilidad de Flujo API)

| Endpoint | Acción | Role Requerido | Evidencia | GAP (SI/NO) |
|---|---|---|---|---|
| `POST /users/*` | WRITE | `admin` | `deps.py` (`get_current_admin_user`) | NO |
| `POST /requisitions` | WRITE | `admin`, `manager`, `toolroom`, etc. | `requisitions.py:42` | NO |
| `POST /tickets` (Cierre) | UPDATE | `admin`, `supervisor`, `toolroom` | `tickets.py:97` | NO |
| `GET /materials` | READ | Ninguno (Cualquier Auth) | `materials.py` (No Deps extra) | NO |
| **`POST /movements` (Kardex)** | **WRITE** | **Ninguno (Solo JWT Auth)** | `inventory_service.py` / `inventory.py` | **SÍ (CRÍTICO)** |
| `POST /materials` | WRITE | Ninguno (Solo JWT Auth) | `materials.py:38` | **SÍ (CRÍTICO)** |

---

## T3) DB / RLS Coverage (Aislamiento DDL)

| Tabla | RLS Enabled | Policies Confirmadas (HC-3) | ¿Evalúa Plant? | ¿Evalúa Role? | GAP (SI/NO) |
|---|---|---|---|---|---|
| `materials` | SÍ | `plant_isolation_materials` | SÍ | **NO** | **SÍ**. Solo valida Planta, permitiendo que cualquiera manipule SKUs cruzados dentro del mismo tenant si vulneran el backend. |
| `inventory_movements` | SÍ | `plant_isolation_movements` | SÍ | **NO** | **SÍ**. No hay candados de base de datos impidiendo escrituras no autorizadas (`auth.jwt()->>'role'`). |
| `profiles` / `locations` | SÍ | N/A (Se purgaron todos los Public en HC-3.1) | N/A | N/A | N/A |

---

## T4) Hallazgos y Severidad

| ID | Descripción | Severidad | Evidencia Exacta |
|---|---|---|---|
| **GAP-01** | **Escritura Libre en Inventario API** | **CRÍTICA** | `app/api/v1/endpoints/inventory.py` l.50-60. `POST /movements` no implementa validación de roles de ningún nivel, y cualquier operario regular puede inyectar deltas llamando a `atomic_inventory_movement_v1`. |
| **GAP-02** | **Carencia de Role-Gate en Engine RLS** | **ALTA** | Las migraciones protectoras dictaminadas en `20260302_rls_hardening_multi_plant.sql` son **Planta-Blindadas (Tenant-Isolation) pero NO Rol-Blindadas**. Alguien con conexión directa a la DB puede enviar `INSERTS` o `UPDATES` a `materials` solo con poseer a la Planta correcta saltándose el esquema de permisos. |
| **GAP-03** | **RPC Security Definers Bypassean RLS** | **CRÍTICA** | Búsqueda global arrojó más de 10 RPCs marcados como `SECURITY DEFINER` (Ej: `process_ledger_movement` en `20260130_phase4_kardex_hardening.sql:79`). Las mutaciones corren silenciosamente en Postgres como administrador base, aniquilando el RLS. |
| **GAP-04** | **Identidad de Rol Esquizofrénica (JWT vs DB)** | **MEDIA** | `deps.py` confía ciegamente en `user_metadata`, mientras `RequisitionService` levanta su propia versión consultando `profiles` evadiendo la API. Requiere unificación UOT (Single Source of Truth). |

---

## Veredicto Fase 1 HC-4: NO-GO ⛔
El aislamiento perimetral por Rol está virtualmente quebrado por diseño en las capas nucleares (Inventario/Kardex) debido a la omisión de `deps` protectores de la API (GAP-01) sumado a la ceguera restrictiva del RLS actual (GAP-02). Se bloquea por regla genérica fail-closed el pase de seguridad.
