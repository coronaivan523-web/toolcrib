# AUDIT REPORT: 2026-02-27_BASELINE

**Commit Hash Inicial:** `5421257d584e418723b9e4f20a0c54d82335baf6`
**Commit Hash Final:** N/A (Read-Only)
**Fecha:** 2026-02-27
**Auditor:** Antigravity (Lead Engineer & Auditor)

## 1. CAMBIO O EVENTO EVALUADO
Auditoría Baseline del estado real del ToolCrib System v7 a nivel arquitectónico, seguridad, y validación de clonación offline (V7.3).

## 2. EVIDENCIA
- `C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib_peritaje_fase1.txt`
- `C:\Users\Ivan.Corona\.gemini\antigravity\scratch\pg_restore_v7_3.log`

## 3. PRUEBAS EJECUTADAS Y HALLAZGOS
1. **Modelado y Dependencias:** Se analizaron scripts `.sql` y constraints DB. Se hallaron más de 30 referencias foráneas activas `REFERENCES auth.users(id)` sobre el schema `public`.
2. **Postura de Seguridad y API:** 
   - `app/main.py` registra logs de peticiones sin censurar PII y URL (`backend_debug_manual.log`).
   - CORS está peligrosamente abierto (`allow_origins=["*"]`).
3. **Restauración (Clonación):** Al simular/restaurar backup de staging (`pg_restore_v7_3.log`), se detectan errores fatales `violates foreign key constraint "cycle_count_lines_counted_by_fkey"` impidiendo la carga de datos sobre identidades inexistentes en schema local.

## 4. VEREDICTO Y RECOMENDACIÓN
**Veredicto:** NO-GO 

**Justificación:**
El estado actual del proyecto está profundamente acoplado a Supabase en la capa de datos (`auth`), impidiendo Disaster Recovery (Clonación) predecible. Además expone riesgos de seguridad severos a nivel Backend y es incapaz de aislar datos de manera segura entre plantas (Mono-Tenant de tacto débil).

**Próximos Pasos Recomendados (PI):**
- FASE P0 (Acción Inmediata): Remover restricciones físicas FK hacia `auth.users` sin modificar el código frontend actual, mitigando los crasheos de clonación, referenciando un Identity Data Table central (`public.profiles`/`public.app_users`).
