# 13 CLONE STRATEGY AFTER DECOUPLE

**Documento de Arquitectura y DevOps**
**Contexto:** P0 Identity Decouple

## EL BLOQUEO ACTUAL (POR QUÉ FALLÓ V7.3)
Durante la corrida del script `clone_failclosed_v5.ps1`, `pg_restore` intentaba insertar un ticket o un conteo de ciclo en la base de datos de Staging. La base de datos, cumpliendo su deber, verificaba la restricción `REFERENCES auth.users(id)`. Como estamos restaurando *solo* el schema `public`, el usuario no existía en el schema `auth` de Staging, disparando excepciones fatales y abortando todo el restore.

## ESTRATEGIA POST-DESACOPLE (BENDICIÓN PARA DEVOPS)

Al completar la FASE P0 y apuntar todas las FKs de transacción (`tickets`, `requisitions`) hacia `public.profiles`, y al **liberar a `public.profiles` de su anclaje a `auth.users`**, se produce un efecto en cadena altamente beneficioso:

### 1. Clonación Limpia (`pg_dump` Standalone)
El script de clonación actual V7 interactuará con una base de datos 100% autocontenida en el schema `public`.
- Se volcará `public.profiles` con UUIDs (Ej. `user-uuid-123`).
- Se volcarán los `tickets` apuntando a `user-uuid-123`.
- Ambos residen en `public`. La restauración validará la FK internamente y **triunfará (PASS)** sin requerir exportar o sobreescribir hashes de contraseñas de producción (que viven en el intocable y encriptado schema `auth`).

### 2. Sincronización de Sesiones (Testing en Staging)
- **Problema:** En staging, si intentamos iniciar sesión con "admin_produccion@wasion.com", fallará porque el schema `auth` real de staging está vacío o tiene a sus propios usuarios de prueba. Los datos (Kardex, Requisiciones) clonados le pertenecen a UUIDs de Prod.
- **Solución (Impersonation):** En staging, un QA puede crear una cuenta local `tester@staging.com`. Se insertará con éxito en `auth.users` (Staging). Luego, manualmente (vía SQL) se actualiza un ticket clonado o el rol de perfil (`UPDATE public.profiles SET id = 'qauuid' WHERE email = 'tester@...';`) o se utilizan herramientas de "User Impersonation" a nivel base de datos para pruebas puras de UI con datos reales clonados.

### 3. Habilita Multi-Tenant Global (Fase P1)
Safa del yugo de Supabase Auth puro, permitiendo que el Frontend llame a un Gateway Propio (FastAPI). El backend extrae el UUID del JWT de OAuth corporativo, y lo opera sobre `public.profiles`, respetando el Tenant ID inyectado, sin chocar contra bases PaaS inflexibles.
