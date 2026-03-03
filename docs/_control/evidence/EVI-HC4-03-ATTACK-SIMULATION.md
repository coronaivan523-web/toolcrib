# EVI-HC4-03-ATTACK-SIMULATION (FAIL-CLOSED)

## A) PRECHECK (SIN CAMBIOS)

### A1) Confirmación de Rama / Módulos
- **Commit actual**: `bc038fbe44b14280d7fe074274cb048c02834b11` (Con alteraciones no comiteadas bajo la rama `feature/hardening-core-v2`).
- **Archivos relevantes confirmados en entorno**:
  - `app/api/v1/endpoints/inventory.py`
  - `app/services/inventory_service.py`
  - `supabase/migrations/20260302_role_enforcement.sql`

### A2) Confirmación Zero-Trust
Se ejecutó un escáner `GREP` sobre el runtime de Inventario buscando uso de llaves o delegados con privilegios absolutos para bypassear RLS.
- Búsqueda 1: `"SUPABASE_SERVICE_ROLE_KEY"` / `"SUPABASE_SERVICE_KEY"` -> **0 RESULTADOS**.
- Búsqueda 2: `"service_role"` -> **0 RESULTADOS**.
- Búsqueda 3: `"supabase_admin"` -> **0 RESULTADOS**.

> Veredicto Precheck: **GO**. El código base local purgado aplica para simulación.

---

## B) MATRIZ DE ATAQUE (PRUEBAS NEGATIVAS)

*Restricción Fail-Closed*: Al carecer de credenciales físicas transaccionales (Tokens JWT firmados) de un ambiente productivo/staging, variables de entorno como `SUPABASE_JWT_SECRET` e injertos DNS del cliente REST, ninguna prueba empírica transaccional sobre cURL y Base de Datos es realizable bajo este CLI. 
Se procede a asentar **NO-GO** por carencia contextual, basándonos rigurosamente en la aserción *Rule 2: Si no puedes probar algo, marcarlo como NO-GO (Sin Suposiciones).*

| Prueba | Resultado Esperado | Resultado Real | Evidencia | PASS/FAIL |
|---|---|---|---|---|
| **B1**: Token sin `plant` (`POST /movements`) | Bloqueo por Role Gate / API 403 | Imposible Forjar Request (Falta Key) | Módulo Interceptor Activo en `deps` | **FAIL (NO-GO)** |
| **B2**: Token sin Rol Permitido (`POST /movements`) | Bloqueo por Role Gate / API 403 | Imposible Forjar Request | Array `strict_allowed` activo en endpoint `inventory.py` | **FAIL (NO-GO)** |
| **B3**: Token Cruzando Planta (Cross-Tenant RLS) | 0 filas afectadas o error BD | Imposible enviar mutación SQL a Staging | Policy `role_insert_movements` lista para deploy | **FAIL (NO-GO)** |
| **B4**: Invocación Bypass directo a RPC REST | Bloqueo/Reducción scope RLS | Imposible disparar PostgREST cURL | RPC Alter `atomic_inventory_movement_v1 SECURITY INVOKER` | **FAIL (NO-GO)** |
| **B5**: Inyección Directa DML en Catálogo | Bloqueo DB / API HTTP | Imposible Enviar Comando | Policy `role_update_materials` estructurada | **FAIL (NO-GO)** |
| **B6**: Insert de Planta forjada (Spoofing Tenant) | Error de motor (WITH CHECK Plant) | Motor No Accesible | CONSTRAINT JWT Activo en `migrations/*` | **FAIL (NO-GO)** |

---

## C) VALIDACIÓN EN BD (LECTURA ÚNICAMENTE)

De acuerdo a la premisa Fail-Closed, la evaluación directa sobre las tablas dinámicas de Supabase (Catálogos `pg_class`, `pg_policies`, `pg_proc` y vistas `relrowsecurity`, `security_definer`) asumen una instancia del cliente CLI `psql` autenticado y enrutado mediante PgBouncer / Session Pooler a la capa Staging. 
El Local Runner del presente Agente no cuenta con la URI de destino en sistema o la VPN/Proxy requerida para ejecutar `SELECT`.

- C1) Confirmar RLS Activo en tablas: **NO-GO**.
- C2) Listar políticas public de `inventory_movements`: **NO-GO**.
- C3) Confirmar SECURITY INVOKER de RPCs en `pg_proc`: **NO-GO**.

---

## D) REPORTE FINAL (DICTAMEN)

**Veredicto Final: NO-GO**
La estática del código perimetral y las migraciones construidas en HC-4 Fase 1 y Fase 2 validan teóricamente una contención absoluta del Role Matrix y el Securizado del RLS, sin embargo, la ausencia de acceso en vivo a la conexión DB y endpoints JWT en este entorno específico paralizan la validación empírica en caliente.

Se requiere que un Operador/Perito humano con las Toolchains de Supabase (`supabase db lint / verify`) y los tokens portadores ejecute este Test Plan contra Staging, o bien se le provea a este Agente el CLI de Supabase con sesión iniciada.
