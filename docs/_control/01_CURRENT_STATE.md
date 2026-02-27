# 01 CURRENT STATE: SNAPSHOT ARQUITECTÓNICO Y RIESGOS

## RESUMEN EJECUTIVO (BASADO EN PERITAJE FASE 1)
El sistema actual transaccionó desde un MVP orgánico, generando un fuerte acoplamiento (Vendor Lock-in) a infraestructuras específicas de Supabase y una deuda técnica restrictiva para operaciones corporativas multi-país.

## HALLAZGOS CRÍTICOS (LA DEUDA QUE BLOQUEA ESCALABILIDAD)

### 1. MODELO DE IDENTIDAD (ACREEDOR DE FALLOS DE CLONACIÓN)
- **Bloqueo V7.3:** La clonación `pg_dump`/`pg_restore` entre producción y staging falla consistentemente con errores "violates foreign key constraint".
- **Causa Raíz:** Existen más de 30 referencias foráneas directas (FKs) desde el schema `public` (`profiles`, `tickets`, `material_events`, `messages`, etc.) hacia `auth.users(id)`. Como `auth` es un schema protegido y no se extrae por defecto, el restore encuentra IDs huérfanos.
- **Estado:** CRITICO. Bloquea DR (Disaster Recovery) real y entornos de preproducción.

### 2. AISLAMIENTO MULTI-TENANT
- **Actual:** Mono-Tenant monolítico simulado. 
- **Mecanismo:** Solamente existe una columna de texto libre `plant` en la tabla `materials` y `tickets`. 
- **Problema:** No hay RLS que bloquee efectivamente la visibilidad a nivel de base de datos entre ingenieros de "Planta México" y "Planta China".
- **Estado:** RIESGO ALTO de cross-tenant data leak.

### 3. INTERNACIONALIZACIÓN (I18N)
- **Actual:** Strings visuales hardcodeados en el código React (JSX).
- **Problema:** No hay abstracción de diccionario ni librerías (ej. `react-i18next`). Zonas horarias predeterminadas en UTC sin preferencias de usuario.
- **Estado:** NO PREPARADO.

### 4. POSTURA DE SEGURIDAD (RED Y LOGS)
- **Logs de Backend:** Se exponen tokens, PII y tráfico interno en logs estáticos (`backend_debug_manual.log`) generados en `app/main.py`.
- **CORS:** Totalmente abierto `allow_origins=["*"]` en producción, permitiendo ataques CSRF masivos si la identidad del proxy falla.
- **Acceso:** Lógica de negocio parcialmente inactiva en el backend y fuertemente delegada a Triggers anidados (`handle_new_user`).

## VEREDICTO
El modelo actual de **"Smart DB / Dumb Frontend"** es insostenible para migrar a un PostgreSQL On-Premise. Requerimos mover la inteligencia al Backend (FastAPI).
