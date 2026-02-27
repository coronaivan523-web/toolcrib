# 03 DECISIONS LOG (ADR - ARCHITECTURE DECISION RECORDS)

Registro inmutable de decisiones arquitectónicas de alto impacto.

| DEC-ID | Fecha | Título | Contexto (Por qué) | Decisión | Consecuencias | Estado |
|---|---|---|---|---|---|---|
| DEC-001 | 2026-02-27 | Aislar Identidad (Desacoplar auth.users) | La clonación y backups fallan por FKs cruzando schemas (public -> auth). Lock-in alto con Supabase. | Reemplazar todas las FKs físicas a `auth.users` por FKs a `public.profiles` (o renombrar a `public.app_users`). | Requiere refactor masivo de DB y triggers, asegura DR (Disaster Recovery). | APROBADO |
| DEC-002 | 2026-02-27 | Mantener "Smart DB" (Temporal) | Migrar toda la lógica al backend ahora detendría operaciones. | Ejecutar estabilización en fases. Fase 1 solo aisla identidad. Fase 2 mueve APIs al Backend. | Retrasa acoplamiento agnóstico, mantiene funcionalidad actual estable. | APROBADO |
| DEC-003 | 2026-02-27 | Multi-Tenant Físico o Lógico | Expansión a múltiples países requiere no mezclar catálogos ni operaciones críticas por seguridad. | Adoptar Row-Level Isolation (Lógico) usando una tabla puente `plant_id`. | Todo request deberá inyectar o resolver contexto de planta (via JWT/Backend). | PROPUESTO |
| DEC-004 | 2026-02-27 | Pipeline de Auditoría (Fail-Closed) | Al tener un ambiente hostil/inestable no podemos hacer push directos a DB. | Toda alteración requiere un snapshot previo y confirmación en `_control/evidence/`. | Velocidad de desarrollo baja pero seguridad/estabilidad máxima. | APROBADO |
| DEC-005 | 2026-02-27 | Main protegido (Release Gates) | Es vital evitar inyecciones a la rama principal sin revisión. | Main protegido — solo merge vía PR con audit PASS (Ver 11_RELEASE_GATES.md). | Prevención de caídas silenciosas en PROD. | APROBADO |
