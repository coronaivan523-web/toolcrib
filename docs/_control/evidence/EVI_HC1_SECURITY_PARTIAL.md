# EVI-HC1-SECURITY-PARTIAL

## Cambios realizados
- `app/core/config.py`: Inyección de las variables maestras `ENVIRONMENT` (default `development`) y `FRONTEND_ORIGIN` (opcional) al esquema principal de `Settings`.
- `app/main.py`: Se reemplazó el uso crítico de la lista abierta `allow_origins=["*"]` en `CORSMiddleware`. Ahora se inyectan orígenes basados puramente en su validación ante el entorno (`ENVIRONMENT == "development"`). Adicionalmente se envolvió la integración de la clase iteradora sincrónica `app.add_middleware(DebugMiddleware)` en una bifurcación de entorno idéntica para blindar la producción contra bloqueos de disco de depuración.
- `app/core/deps.py`: Eliminación definitiva del *Hardcoded Debug Escalation* que sobreescribía al perfil como `admin` indiscriminadamente si el correo detectado era de `wasion` o empezaba con `debug`. Remoción de la vulnerabilidad de Information Disclosure que persistía al imprimir de forma literal todo el objeto `user_response` en la consola de validación JWT.
- `app/services/requisition_service.py`: Depuración del método interno `_get_admin_client()` al eliminar toda bifurcación con el key de servicio. A partir de la fecha opera despachando el cliente subyacente limitado por restricciones generales del RLS de PostgreSQL de Supabase.
- `app/api/v1/endpoints/messages.py`: Intercambio de la importación aliada `from app.core.supabase import supabase_admin as supabase` por la importación estricta y segura `from app.core.supabase import supabase`.

## Validaciones
- **[x]** Confirmado: No existe de aquí en adelante el patrón falso para asignar administradores de depuración en la validación local de tokens.
- **[x]** Confirmado: No existe wildcard subyacente inamovible de dominio persistente (CORS) en producción.
- **[x]** Confirmado: DebugMiddleware no es capaz de inyectarse bajo la premisa de entorno `production`.
- **[x]** Confirmado: Ningún token JWT o perfil de `SupabaseUser` sin sanitizar es volcado en los logs desde el despachador central `deps.py`.
- **[x]** Confirmado: `SERVICE_ROLE` dejó de utilizarse de forma transparente para las actividades transaccionales de Requisiciones y Mensajes directos.
- **[x]** Confirmado: Se logró evadir el riesgo sistémico transaccional de tocar `process_ledger_movement` y aislar `inventory_service.py` como un módulo separado a estabilizar en HC-2.

Rama `feature/hardening-core-v2` mantenida de manera aislada. Sin *Merges*.
