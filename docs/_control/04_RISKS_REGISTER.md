# 04 RISKS REGISTER

Listado vivo de amenazas al sistema, estabilidad o roadmap corporativo.

| ID Riesgo | Severidad | Probabilidad | Descripción | Impacto | Estrategia de Mitigación | Dueño / Tracking |
|---|---|---|---|---|---|---|
| R-001 | CRÍSTICO | ALTA | **Lock-in IAM de Supabase**. Refactor de >30 FKs rompe el sistema completo al ejecutar migraciones complejas de identidad. | Inoperabilidad de DB. Tiempo caído. | Realizar clones destructivos offline. Auditoría progresiva con evidencias manuales por cada DROP CONSTRAINT. | Ingeniería Core / En Proceso (P0) |
| R-002 | ALTO | MEDIA | **Filtración de Datos Multi-Planta (Cross-Tenant Leak)**. Un RLS defectuoso o un API endpoint desprotegido expone datos de México en China o viceversa. | Incumplimiento corporativo grave. | Implementar inyección mandatoria de `tenant_context` en PostgreSQL vía `set_config`. Todo RLS debe validar el claim de planta. | Ingeniería Core / Abierto (P1) |
| R-003 | ALTO | ALTA | **API Abierto (CORS / Logs)**. Backend en FastAPI expone PII o logs crudos al proxy. | BRECHA DE SEGURIDAD. Scraping corporativo. | Sanitizar `DebugMiddleware`, restringir orígenes CORS al dominio validado (o puertos delimitados en DEV). | Ingeniería Core / Abierto (P1) |
| R-004 | MEDIO | MEDIA | **Internacionalización Rota (i18n)**. Despliegues en otras fronteras fallan por UX hardcodeado a español y zonas UTC estáticas sin conversión cliente. | Experiencia de usuario inaceptable; errores en recuentos de inventario (Kardex de horas cruzadas). | Integrar `react-i18next` y normalizar formatos ISO-8601 en Backend resolviendo tzinfo dinámicamente. | Equipo Web / Pendiente (P2) |
