# CHECKLIST: P1 - SECURITY HARDENING (RED Y LOGS)

**Objetivo:** Evitar exposición de datos corporativos filtrados crudos, ataques XSS, CSRF y uso excesivo de PostgREST como cliente.

## ETAPA 1: PURGA DE MIDDLEWARES Y LOGS
- [ ] Rastrear y comentar/eliminar todo `print(f"[MIDDLEWARE OUTER] {method} {url}")` destructivo.
- [ ] Eliminar volcado crudo a `backend_debug_manual.log` de Body, PII o Headers que contentan Authorization Bearer o Sub.
- [ ] Habilitar Pydantic models para sanitize requests.

## ETAPA 2: CORS RESTRICTIVO (API GATEWAY)
- [ ] Cambiar de `allow_origins=["*"]` a lista estricta (ej. `https://toolcrib.wasion.com`, `http://localhost:5173`).
- [ ] Habilitar variables de entorno en Pydantic (`settings.CORS_ORIGINS`).

## ETAPA 3: REVISIÓN DE SECRETS DE INFRA
- [ ] Confirmar que `clone_failclosed_v5.ps1` no expone contraseñas Postgres al fallar en el STDOUT local.
- [ ] Implementar In-Memory connection handling via `.env` o Secret Stores corporativos (Vault/K8s).

## ETAPA 4: VERIFICACIÓN
- [ ] Hacer query via Postman cambiando el header "Origin" a algo aleatorio: Debe retornar HTTP 403 / CORS Error Mismatch.
- [ ] Verificar que ejecutar clone crashee seguro (Fail-Closed) sin imprimir el password de staging en consola.
