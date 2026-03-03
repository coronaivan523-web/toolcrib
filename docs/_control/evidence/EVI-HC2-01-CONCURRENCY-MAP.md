# EVI-HC2-01-CONCURRENCY-MAP

## 1) MAPA READ-MODIFY-WRITE

**RMW 1: `app/services/inventory_service.py` (`create_movement`)**
- PATH:LINEA: `app/services/inventory_service.py:36-63`
- FUNCIÓN: `create_movement`
- TABLAS AFECTADAS: `materials`
- ¿HAY TRANSACCIÓN? (BEGIN/COMMIT): **NO** (Es una ejecución REST estándar asíncrona hacia Supabase).
- ¿HAY LOCK? (SELECT FOR UPDATE): **NO**. Se lee el stock en L18 (`select('*').eq('id', ...).single()`), aritméticamente se suma en Python (L37) y se empuja un update ciego (L63). En alta volumetría, un segundo hilo puede leer el mismo stock base antes que el primero haga su update.

**RMW 2: `app/services/cycle_count_service.py` (`commit_line`)**
- PATH:LINEA: `app/services/cycle_count_service.py:251-320`
- FUNCIÓN: `commit_line`
- TABLAS AFECTADAS: `materials`
- ¿HAY TRANSACCIÓN? (BEGIN/COMMIT): **NO**.
- ¿HAY LOCK? (SELECT FOR UPDATE): **NO**. Lee el stock base en L251 y empuja directo la variable `qty_physical` como nueva verdad absoluta en L320.

**RMW 3: `app/services/requisition_service.py` (`incoming_materials`)**
- PATH:LINEA: `app/services/requisition_service.py:615-624`
- FUNCIÓN: `incoming_materials`
- TABLAS AFECTADAS: `requisition_items`
- ¿HAY TRANSACCIÓN? (BEGIN/COMMIT): **NO**.
- ¿HAY LOCK? (SELECT FOR UPDATE): **NO**. Lee la cantidad recibida en L615 (`single()`), le suma la del payload y hace `update()` en L624.

---

## 2) MAPA DE OPERACIONES MULTI-WRITE SIN TRANSACCIÓN

**Flujo A: Creación de Borrador de Requisición (`create_draft`)**
- PATH:LINEA: `app/services/requisition_service.py:26-97`
- TABLAS: `requisitions` (L52) -> `requisition_items` (L84) -> `requisition_attachments` (L96).
- TRANSACCIÓN: **NO**. Si el script colapsa al insertar ítems, el Header (`requisitions`) queda huérfano.

**Flujo B: Someter a Aprobación (`submit_requisition`)**
- PATH:LINEA: `app/services/requisition_service.py:167-381`
- TABLAS: `requisitions` (L200) -> `requisition_approvals` (L219, L256, L370).
- TRANSACCIÓN: **NO**.

**Flujo C: Ingreso de Materiales por Requisición (`incoming_materials`)**
- PATH:LINEA: `app/services/requisition_service.py:592-660`
- TABLAS: `requisition_items` (L624) -> `inventory_movements` + `materials` (llamando a `InventoryService.create_movement` L636) -> `requisitions` (Estado L654).
- TRANSACCIÓN: **NO**. Si falla el servicio de inventario a la mitad del bucle de ítems, el sistema entra en una severa corrupción de Kardex vs Estado del Documento.

**Flujo D: Compromiso de Línea de Conteo Cíclico (`commit_line`)**
- PATH:LINEA: `app/services/cycle_count_service.py:219-331`
- TABLAS: `inventory_movements` (L277) -> RPC Shadow Ledger (L300) -> `materials` (L319) -> `cycle_count_lines` (L326).
- TRANSACCIÓN: **NO**. Todo se hace usando REST POSTs lineales interceptables por fallos de red.

---

## 3) PUNTOS DE "WRITE CIEGO" A `materials.current_stock`

1. `app/services/inventory_service.py:63`
   ```python
   supabase_admin.table('materials').update({"current_stock": new_stock}).eq('id', movement_in.material_id).execute()
   ```

2. `app/services/cycle_count_service.py:319`
   ```python
   client.table('materials').update({
       'current_stock': qty_physical,
       'last_counted_at': now
   }).eq('id', material_id).execute()
   ```

---

## 4) ESTADO DEL LEDGER (HÍBRIDO)

El estado actual del ledger rompe la arquitectura Inmutable de Tipo Banco y fuerza un estado Dual/Híbrido. Existen 3 puntos de anclaje:

- A) **Inserción `inventory_movements`**: En `inventory_service.py:56` y `cycle_count_service.py:277` (Múltiples flujos escriben en Ledger).
- B) **Actualización Escalar `materials`**: Una vez logrado A, los servicios calculan el impacto del RMW y empujan a L63 / L319 forzosamente. Rompe Single Source of Truth.
- C) **RPC Oculto `process_ledger_movement`**: En paralelo, `inventory_service.py:71` invoca una función RPC documentada como `[DUAL-WRITE INJECTION - SHADOW MODE]`. Está corriendo duplicado e intentando aplicar lógica contable, pero fallando silenciosamente con `try/except pass` en caso de error.

---

## 5) RLS / ROLES RELEVANTES A INVENTARIO

- **Conteo Cíclico**: Pasa explícitamente el token actual del coordinador (`client: Client` provisto por API que usa `get_current_active_user`). 
- **Inventario Regular**: Bypassea deliberadamente cualquier control de identidad e invoca un objeto estático forzado en L13 `if not supabase_admin:` para realizar los updates y rpcs. Usa la clave `SUPABASE_SERVICE_KEY`. Esto desvirtúa el "Audit Trail" en la base de datos ya que PostgREST verá un usuario anónimo con privilegios infinitos, forzando a enviar el `user_id` manual en las columnas.
