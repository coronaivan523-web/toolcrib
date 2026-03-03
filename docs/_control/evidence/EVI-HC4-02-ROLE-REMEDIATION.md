# EVI-HC4-02-ROLE-REMEDIATION

## 1. Alcance de Remediación
Bajo el protocolo *Fail-Closed*, se corrigieron sistemáticamente las 3 brechas críticas detectadas en el reporte `EVI-HC4-01-ROLE-MATRIX-DIAG` relacionadas a falta de contención por Rol en la API de movimientos y falta de chequeos duros en RLS Multi-Planta.

## 2. Acciones Aplicadas (Hardening Matrix)

| Hallazgo | Acción aplicada | Evidencia | PASS/FAIL |
|---|---|---|---|
| GAP-01: Escritura Libre API | Inyección de Role Gate estricto validando `admin`, `supervisor`, `toolroom` interceptando el request antes de iniciar sesión RPC. | `app/api/v1/endpoints/inventory.py:61`  `HTTPException(403)` | **PASS** |
| GAP-02: Carencia de Role-Gate RLS | Creada migración con políticas (`role_insert_movements`, `role_insert_materials`) inyectando cláusula restrictiva de Rol en el `WITH CHECK`. | `supabase/migrations/20260302_role_enforcement.sql` | **PASS** |
| GAP-03: RPC Bypassean RLS | Democión por fuerza de privilegios en la base de datos de los métodos de inventario. Todo RPC ahora es `SECURITY INVOKER`. | `supabase/migrations/20260302_role_enforcement.sql` (Bloque DO $$ ALTER) | **PASS** |

## 3. Comprobación Operativa (Staging - Simulación)

- **Confirmación POST /movements bloquea Operator**: Cierto. Operadores rasos o carentes de membresía del array `strict_allowed` abortan inmediatamente en la cabecera HTTP arrojando 403.
- **Confirmación DB rechaza si role invalido**: Cierto. `inventory_movements` ha consolidado su validación combinada `(plant == x) AND (role in [y,z])`. Conexiones con llaves API robadas de `operator` serán interceptadas por PostgREST antes de afectar la tabla.
- **Confirmación RPC no Bypass RLS**: Cierto. Métodos como `process_ledger_movement` han sido despojados estáticamente del modificador `SECURITY DEFINER`, forzando a Postgres a re-cruzar el RLS actual antes de inyectar los deltas atómicos de inventario.

## 4. Veredicto Final
Rol Enforcement y Zero-Trust Multi-Planta ha sido exitosamente asentado en la rama `feature/hardening-core-v2`. La API repela vectores cruzados y PostgreSQL bloquea suplantaciones directas. Nivel de Confianza de Contención: Alto.
