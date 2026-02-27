# 08 CHANGELOG (DIARIO DEL CAPITÁN)

Historial cronológico de cambios estructurales e intervenciones del agente.

| Fecha/Hora | Tarea / Decisión | Descripción del Cambio | Evidencia / Commit | Autor |
|---|---|---|---|---|
| 2026-02-27 | Setup Inicial | Se inicializa la carpeta `docs/_control` con las reglas doradas del sistema y el Roadmap P0-P2. | `docs/_control/*` | Antigravity AI |
| 2026-02-27 | Git Hygiene | Se agregaron logs, dependencias locales y scripts de clonación untracked al `.gitignore`. Se limpiaron archivos innecesarios del tracking con `git rm --cached` conservándolos locales. | `.gitignore` | Antigravity AI |
| 2026-02-27 | P0 Identity Decouple | COMPLETADO EN STAGING (Eliminadas dependencias a auth.users, repuntadas a public.profiles. Validación estática exitosa, Gate 4 aprobado para PROD). | `docs/_control/audits/AUDIT_P0_IDENTITY_DECOUPLE.md` | Antigravity AI |
| | | | | |
| | | | | |
| | | | | |

## Instrucciones para el llenado
1. **Nunca omitir un DROP o un ALTER TABLE.** Todo cambio al schema DB se registra aquí.
2. Si un script falló, registrar la reversión como un evento (ej. "Revertido DROP de auth.users por error FK: ver evidencia XYZ").
3. Si cambia el estado en el Scorecard (ej. de PENDIENTE a COMPLETADO), agregar una línea aquí.
