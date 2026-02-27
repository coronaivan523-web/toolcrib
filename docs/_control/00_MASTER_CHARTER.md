# 00 MASTER CHARTER: TOOLCRIB CONTROL ROOM

## PROPÓSITO
Este repositorio de control (`docs/_control/`) sirve como la "fuente única de verdad" inmutable para la refactorización y estabilización estructural del sistema ToolCrib corporativo. 
Garantiza la continuidad del contexto técnico al transicionar entre sesiones, chats o equipos, implementando el modelo **"UNA sola empresa con múltiples plantas/países" (Multi-tenant interno por planta)**.

## REGLAS DE ORO (FAIL-CLOSED)
1. **READ/WRITE ISOLATION:** La carpeta `_control/` es el registro principal. Cualquier hallazgo, riesgo o decisión técnica **debe documentarse aquí antes o al mismo tiempo** que se modifique código.
2. **NO ASSUMPTIONS:** Si no hay evidencia, el sistema asume que está roto. Todo cambio de seguridad debe venir respaldado por una captura de evidencia o query en `evidence/`.
3. **READ-ONLY PREFERED:** En auditorías progresivas, el código no se rompe. Primero analizamos, documentamos el Delta y luego ejecutamos.
4. **CREDENTIAL SAFECATCH:** CERO impresión de contraseñas, tokens JWT, o variables de entorno en estos documentos. Referenciar solo por nombre de variable (e.g., `SUPABASE_KEY`).

## ALCANCE
- **FASE 1:** Peritaje inicial (Completado).
- **FASE 2:** Hardening Estructural (Desacople de Identidad + Aislamiento por Tenant).
- **FASE 3:** Preparación para Enterprise/On-Premise (Desacople de Supabase sdk -> Postgres puro).

## ESTRUCTURA DEL CONTROL ROOM
- `01_CURRENT_STATE.md`: La foto fija del desastre o la deuda técnica actual.
- `02_TARGET_ARCHITECTURE.md`: El diseño del castillo a construir.
- `03_DECISIONS_LOG.md`: Bitácora de "Por qué se hizo X y no Y".
- `04_RISKS_REGISTER.md`: Qué puede explotar y cómo lo mitigamos.
- `05_ROADMAP_P0_P1_P2.md`: Hoja de ruta estricta.
- `06_AUDIT_PLAYBOOK.md`: Reglas sobre cómo se audita a sí mismo Antigravity.
- `07_PROGRESS_SCORECARD.md`: La boleta de calificaciones.
- `08_CHANGELOG.md`: Diario del capitán.
- `09_CHAT_HANDOFF.md`: Contexto inyectable para nuevos chats.
- `checklists/`: Evaluaciones operativas granulares.
- `evidence/`: Logs, queries y outputs que demuestran que las políticas funcionan.
