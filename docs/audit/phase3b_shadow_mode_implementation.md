# Phase 3B: Shadow Mode Implementation Guide

## Objective
This guide verifies the complete, safe implementation of the Inventory Ledger V2 Shadow Mode inside `feature/hardening-core-v2`. This deployment writes transactions cleanly into the new `inventory_ledger_v2` table without removing legacy mutability constraints in `materials.current_stock`.

## 1. Local Testing & Validation
Because this environment is executing dual-write patterns, validating locally requires firing standard endpoints and reviewing the double-impact:

**Test A: Backend Sync Output (Python Dual-Write)**
1. Authenticate with a test user in local frontend.
2. Produce an **Inventory Adjustment** cycle count or Manual Update.
3. Access backend or DB directly and compare:
   `SELECT current_stock FROM materials WHERE id='x'`
   This must match exactly with:
   `SELECT current_stock FROM vw_material_stock WHERE material_id='x'`

**Test B: RPC Sync Output (SQL Dual-Write)**
1. In the frontend, deliver an authorized **Ticket**.
2. Run identical SELECT statements. The new `process_ledger_movement` must have derived valid negative tracking (`-quantity`) alongside the conventional subtraction.

## 2. Checklist for DB Scripts (Staging/Dev Only)
In order to fully execute Shadow Mode, run these sequentially via `psql` or `Supabase SQL Editor`:
- [ ] `db/migrations/ledger_v2/001_create_inventory_ledger_v2.sql`
- [ ] `db/migrations/ledger_v2/002_create_vw_material_stock.sql`
- [ ] `db/migrations/ledger_v2/003_create_rpc_process_ledger_movement.sql`
- [ ] `db/migrations/ledger_v2/004_update_rpc_deliver_ticket_dual_write.sql`

## 3. Python Service Injections
The backend incorporates `rpc('process_ledger_movement')` across:
- `inventory_service.py` -> `create_movement()`: Idempotency Key generates via `MANUAL:{user_id}:{material_id}:{req_uuid}`
- `cycle_count_service.py` -> `commit_line()`: Idempotency Key generates via `CYCLE:{session_id}:{material_id}:{line_id}`
- `requisition_service.py` -> `incoming_materials()`: Idempotency Key generates via `REQ:{folio}:{material_id}:{receipt_line_id}`

## 4. Rollback Plan
Since this change leverages "Shadow Mode" (Write-Only on new tables), reverting is unconditionally safe:
1. Revert Backend Git Commits: `git revert <hash_backend>`
2. Execute `db/migrations/ledger_v2/004_update_rpc_deliver_ticket_dual_write.sql`'s original function equivalent.
3. Drop `inventory_ledger_v2` and `vw_material_stock`. No actual state or reporting features will be compromised since nothing reads from the new tables yet.
