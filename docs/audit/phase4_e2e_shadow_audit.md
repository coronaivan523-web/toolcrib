# End-to-End Shadow Mode Audit & Rollup Plan (Ledger V2)

## TAREA 1: MATRIZ TOTAL DE FLUJOS (END-TO-END)

| Dominio | Archivo / Ruta (Backend) | RPC / SQL | Legacy Write | Ledger V2 Write | Usa `idempotency_key` (Formato) | `shadow_mode` bypass | Riesgo | Acción Requerida |
|---|---|---|---|---|---|---|---|---|
| **Tickets (OUT)** | `api/v1/endpoints/tickets.py` -> `/close` | `deliver_ticket` (RPC) | Sí (`UPDATE materials`, `INSERT movements`) | Sí (Llama a `process_ledger_movement` dentro del RPC) | Sí (`TICKET:{folio}:{mat_id}:{qty}:DELIVERY`) | Sí | **BAJO** | Ya asegurado con el bloque EXCEPTION silencioso introducido en el script 006. |
| **Manual Adjust (IN/OUT)** | `app/services/inventory_service.py` -> `create_movement` | N/A (Python App-side update) | Sí (`UPDATE materials.current_stock` & `movements`) | Sí (Llama a `process_ledger_movement` vía `supabase_admin.rpc`) | Sí (`MANUAL:{mat_id}:{qty}:{uuid}`) | Sí | **BAJO** | Ya asegurado con bloque `try/except` en Python (Fallback Silencioso). |
| **Cycle Counts (ADJ)** | `app/services/cycle_count_service.py` -> `commit_line` | N/A (Python App-side update) | Sí (`UPDATE materials.current_stock` & `movements`) | Sí (Llama a `process_ledger_movement` vía `client.rpc`) | Sí (`CYCLE:{session_id}:{mat_id}:{delta}:{line_id}`) | Sí | **MEDIO** | Python tiene `try/except` para shadow_mode, pero el cliente que invoca es `client` (user token), no `admin`. Podría haber fallos de RLS, pero no bloquea Legacy. |
| **Requisiciones (IN)** | `app/services/requisition_service.py` -> `incoming_materials` | Delega a `InventoryService.create_movement` | Sí (Heredado de Inventory Service) | Sí (Heredado de Inventory Service) | Sí (`REQUISITION:{mat_id}:{qty}:{uuid}`) | Sí | **BAJO** | No requiere acción. Protegido indirectamente por el fix del servicio de inventario. |

---

## TAREA 2: AUDITORÍA DB (SUPABASE) COMPLETA

### A) Triggers
**Hallazgo:** Existen triggers para perfiles (`on_auth_user_created`) y para actualización de estatus de tickets al completar dependencias (`trg_update_pending_items`, `trg_update_pending_tickets`).
**Veredicto:** *NINGÚN* trigger en la base de datos muta de forma oculta la tabla `materials.current_stock` ni inserta en `inventory_movements` o `inventory_ledger_v2`. Toda escritura proviene estrictamente de las invocaciones del Backend/RPC auditadas.

**Query de Validación:**
```sql
SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('materials', 'inventory_movements', 'inventory_ledger_v2');
```

### B) Functions / RPC
**Hallazgos:**
1. `process_ledger_movement` y `deliver_ticket` son **SECURITY DEFINER**, lo que permite invocar de forma segura y consistente superando las RLS normales del public user.
2. Todas las operaciones legadas corren bajo la óptica transaccional del App Server.

### C) Policies (RLS)
**Hallazgo Riesgo Medio:** Aunque `InventoryService` usa `supabase_admin` (seguro), `CycleCountService` usa el token JWT del operario (`client`). Si el `process_ledger_movement` no fuera `SECURITY DEFINER`, esto bloquearía inserciones de Cycle Count. Afortunadamente, **sí es SECURITY DEFINER**, mitigando el riesgo.

### D) Jobs / Cron / Webhooks
**Hallazgos:** No se encontraron sentencias `SELECT cron.schedule(...)` ni suscripciones a webhooks que intercepten `materials` y generen doble procesamiento de stock pasivo.

---

## TAREA 3: CONSISTENCIA Y NO DUPLICIDAD (QUERIES FORENSES)

Ejecutar las siguientes queries en Staging para asegurar la validez del Shadow Mode antes de cortar el Single Write:

**Q1: Deltas por Material (Identificar Discrepancias)**
```sql
SELECT 
    m.id AS material_id, 
    m.part_number,
    m.current_stock AS legacy_stock, 
    COALESCE(v.current_stock, 0) AS derived_stock,
    (m.current_stock - COALESCE(v.current_stock, 0)) as discrepancy_delta
FROM public.materials m
LEFT JOIN public.vw_material_stock v ON m.id = v.material_id
WHERE m.current_stock != COALESCE(v.current_stock, 0);
-- IMPORTANTE: Durante el inicio de Shadow Mode habrá deltas porque el Ledger no tiene un "Baseline".
```

**Q2: Duplicados por Idempotency Key (Validar unicidad)**
```sql
SELECT idempotency_key, COUNT(*) as ocurrencias
FROM public.inventory_ledger_v2
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
-- RESULTADO ESPERADO: 0 files.
```

**Q3: Duplicados por Referencia (Posible doble ejecución lógica)**
```sql
SELECT reference_type, reference_id, material_id, quantity, COUNT(*) as ocurrencias
FROM public.inventory_ledger_v2
GROUP BY reference_type, reference_id, material_id, quantity
HAVING COUNT(*) > 1 AND reference_type != 'MANUAL';
-- RESULTADO ESPERADO: 0 files.
```

**Q4: Últimos Movimientos (Ledger V2 vs Legacy Movements)**
```sql
SELECT 
    lm.id as legacy_id, lm.movement_type as legacy_type, lm.quantity as legacy_qty,
    lv2.id as ledger_id, lv2.quantity as ledger_qty
FROM public.inventory_movements lm
LEFT JOIN public.inventory_ledger_v2 lv2 
    ON lm.material_id = lv2.material_id 
    AND lm.reference_type = lv2.reference_type 
    AND lm.reference_id::text = lv2.reference_id
ORDER BY lm.timestamp DESC LIMIT 10;
```

---

## TAREA 4: GARANTÍA "SHADOW MODE NO BLOQUEA"
**Veredicto: DEGRADED -> FUNCTIONAL.**
Inicialmente el `process_ledger_movement` rompía el flujo. Esta vulnerabilidad fue neutralizada explícitamente sin necesidad de scripts SQL nuevos:
1. `deliver_ticket` (RPC en DB): Cuenta con bloque `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END;`. Totalmente a prueba de fallas.
2. `InventoryService.create_movement` (Python): La llamada al Ledger está abrazada por un bloque `try... except Exception as e: print("[SHADOW MODE ERROR]...")`. El retorno exitoso (`return created_movement`) se ejecuta sin importar el fallo en DB.
3. `CycleCountService.commit_line` (Python): Contiene mitigación idéntica a `InventoryService` con `try/except`.

---

## TAREA 5: PLAN DE CORTE (SHADOW -> SINGLE WRITE)

### Fase A: Shadow Mode (Actual)
- **Operación:** Se corre Dual-Write. Lectura proviene de `materials.current_stock`.
- **Métrica Go/No-Go:** La inserción de tickets, requisiciones y ciclos no se interrumpe y las filas fluyen sanamente a `inventory_ledger_v2`.

### Fase B: Backfill (Insert Baseline)
- **Acción:** Ejecutar un SQL Script que tome todos los registros actuales de `materials.current_stock` y los inserte como el "Saldo Inicial" en el ledger V2 para eliminar los Deltas de **Q1**.
- **Rollback:** `DELETE FROM inventory_ledger_v2 WHERE reference_type = 'BASELINE';`

### Fase C: Read Inversion
- **Acción:** Cambiar los Endpoints y Frontend para realizar lecturas exclusivas de la Vista `vw_material_stock`.
- **Acción DB:** Remover el bypass `shadow_mode=true` de los endpoints Python y del RPC, reactivando la protección de Saldos Negativos estricta.
- **Rollback:** Hacer `git revert` del read-inversion. El Dual-Write y el Legacy Write protegerán los datos subyacentes intactos.

### Fase D: Write Delete (Adiós Legacy)
- **Acción:** Eliminar `UPDATE materials SET current_stock = ...` de FastAPI y DB RPCs. Eliminar inserciones a `inventory_movements`.
- **Rollback:** Restaurar los bloques obsoletos desde el control de versiones de Git.

### Fase E: Deprecación de Columnas
- **Acción:** `ALTER TABLE materials DROP COLUMN current_stock; DROP TABLE inventory_movements;`
- **Rollback:** No es posible hacerlo nativamente sin restaurar backups, por eso esta fase solo se ejecuta tras 14 días ininterrumpidos en Fase D.

## TAREA 6: MANUAL DE PRUEBA E2E (GIVEN / WHEN / THEN)

**1. Entregar Ticket**
*   **Given:** Shadow Mode activado (`shadow_mode=true` en RPC). Ticket en estado `READY` con qty `5`.
*   **When:** Supervisor cierra/entrega el ticket desde la UI.
*   **Then:** HTTP 200 OK. `status` del ticket cambia a `ENTREGADO`. `materials.current_stock` baja 5. `inventory_ledger_v2` registra fila `OUT (-5)` con `shadow_mode=true` e `idempotency_key` (Ej. `TICKET:123:mat_id:5:DELIVERY`). No hay error de stock negativo.

**2. Cancelar/Retornar Ticket**
*(Nota: Actualmente no existe flujo explícito de retorno con impacto en stock en `tickets.py`, solo cambio de estado a `CANCELLED` antes de procesar items. Si en el futuro se implementa retorno, seguirá el mismo patrón `IN` de `InventoryAdjustment`).*

**3. Requisition Approve / Issue**
*   **Given:** Requisición aprobada esperando recepción de material.
*   **When:** Almacenista recibe el material (`quantity_received` en UI).
*   **Then:** HTTP 200 OK. `inventory_service.create_movement` inserta en `materials` e `inventory_movements` (legacy) y dispara `process_ledger_movement` registrando fila `IN` con su respectivo `idempotency_key` (`REQUISITION...`).

**4. Cycle Count (Ajuste por Diferencia)**
*   **Given:** Conteo físico = 45 vs Sistema = 50.
*   **When:** Supervisor autoriza la diferencia (`commit_line`).
*   **Then:** `materials.current_stock` cambia a `45`. Se inyecta al ledger (Dual-Write) mediante `process_ledger_movement` un movimiento de `ADJUSTMENT` con cantidad `-5`.

**5. Ajuste Manual de Inventario**
*   **Given:** Ajuste directo de stock desde la UI (ej. por merma o entrada rápida).
*   **When:** Usuario ejecuta la acción de ajuste manual.
*   **Then:** HTTP 200 OK. `create_movement` (Python) registra en ledger V2 el movimiento bajo `reference_type = MANUAL`.

---

## VEREDICTO FINAL POR FLUJO
* **Deliver Ticket:** FUNCTIONAL (Completamente encapsulado y Shadow Mode no bloqueante).
* **Inventory Adjustment:** FUNCTIONAL (Completamente encapsulado en Python try/catch).
* **Requisitions:** FUNCTIONAL (Hereda la robustez de Inventory Adjustment).
* **Cycle Count:** FUNCTIONAL (Protegido por Python try/catch + Security Definer).
