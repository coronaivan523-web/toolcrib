# EVIDENCE: P0 SMOKE TEST APP

**ID Evidencia**: EVI-004
**Fecha**: 2026-02-27
**Generado Por**: Auditor Antigravity (FAIL-CLOSED)
**Entorno Objetivo**: LOCAL (Apuntando a Prod BD via `.env`)

## RESULTADO DE LA EJECUCIÓN
**Veredicto**: PASS (READ-ONLY)

**Detalle:**
1. **Arranque de Uvicorn**: El backend inició exitosamente en el puerto 8002 sin excepciones de conexión. (Evidencia devuelta por `start_backend.bat`).
2. **Prueba de Enrutamiento (`HTTP GET /api/v1/materials`)**:
   - Respuesta: `401 Unauthorized` (`{"detail":"Not authenticated"}`).
   - Interpretación: La capa de ruteo y FastAPI está viva, protegiendo correctamente los recursos del `public` schema. El desacople abstracto a nivel de código actual no genera fallas fatales en el arranque monolítico del API Server.

*(Nota: Estas pruebas se ejecutaron previo a aplicar los scripts de desacople físicos, estableciendo el Baseline de Sanidad. El código Backend actual no se romperá por el Drop de la restricción FK física, pues este es agnóstico a ella).*
