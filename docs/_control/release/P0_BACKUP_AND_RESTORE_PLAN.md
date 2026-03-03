# P0 Gate — Backup Baseline + Restore Seco

## Objetivo
Validar capacidad real de rollback antes de desplegar P0 en PROD.

## Fase 1 — Backup Baseline (Supabase Managed Snapshot)

Checklist:
- [ ] Confirmar proyecto correcto
- [ ] Confirmar snapshot existente o generar manual
- [ ] Confirmar estado Available/Completed
- [ ] Registrar metadata
- [ ] Confirmar opción Restore visible
- [ ] Registrar evidencia en EVIDENCE_P0_BASELINE_BACKUP.md

Criterio FAIL-CLOSED:
Si no existe snapshot verificable → DETENER PROCESO.

## Fase 2 — Restore Seco (Ensayo Controlado)

Entorno:
- Nuevo proyecto Supabase temporal
- Prohibido PROD

Checklist:
- [ ] Crear entorno limpio
- [ ] Ejecutar restore desde snapshot
- [ ] Confirmar restore sin error
- [ ] Ejecutar validaciones SQL
- [ ] Registrar resultados en EVIDENCE_P0_RESTORE_DRY_RUN.md

Criterio FAIL-CLOSED:
- Error de dependencia a auth.users
- Error en restore
- Tablas críticas inexistentes
- Validaciones SQL fallan

## Veredicto Gate
Solo puede emitirse cuando:
- Backup Baseline = PASS documentado
- Restore Seco = PASS documentado
