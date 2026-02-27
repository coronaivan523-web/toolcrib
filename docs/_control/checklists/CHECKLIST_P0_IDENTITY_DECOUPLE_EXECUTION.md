# CHECKLIST (EXECUTION): P0 IDENTITY DECOUPLE

**Referencia**: `docs/_control/checklists/CHECKLIST_P0_IDENTITY_DECOUPLE.md`
**Operador**: DBA / Release Manager

## PASO 1: FORENSIC & PRE-WORK (✓ COMPLETADO)
- [x] Extraer dependencias exactas (`EVIDENCE_AUTH_DEPENDENCIES.md`).
- [x] Validar que `public.profiles` contiene 1 a 1 de IDs válidos contra Prod.
- [x] Documentar `12_P0_IDENTITY_DECOUPLE_PLAN.md` y someter a DECISION LOG.

## PASO 2: FABRICACIÓN DE SCRIPT BUSTER (OFF-BAND)
- [ ] Construir un archivo SQL puro independiente (Ej. `scripts/migration/01_p0_decouple.sql`).
- [ ] En este archivo, redactar cada `ALTER TABLE ... DROP CONSTRAINT`.
- [ ] En este archivo, escribir la re-conexión: `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES public.profiles(id)`.
- [ ] NO añadir lógica adicional (ni triggers, ni vistas).

## PASO 3: SHADOW RUN LOCAL
- [ ] Descargar un dump crudo de Prod (Solo datos).
- [ ] Correr el script buster sobre una BD Postgres local en Docker.
- [ ] Comprobar que aplica exitosamente y no marca "constraint violations".

## PASO 4: EJECUCIÓN ASÍNCRONA A SUPABASE
- [ ] Aplicar el script vía SQL Editor en Postgres/Supabase Prod.
- [ ] Capturar Log de ejecución con 0 errores y depositar en `docs/_control/evidence/`.

## PASO 5: AUDITORÍA DE CLONACIÓN POST-CAMBIO (DOD)
- [ ] Ejecutar de manera local el `clone_runner.ps1` apuntando Prod->Staging.
- [ ] Confirmar VEREDICTO PASS.
- [ ] Actualizar Scorecard P0 a COMPLETADO.
