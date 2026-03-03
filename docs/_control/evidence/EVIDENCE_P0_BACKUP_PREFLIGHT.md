# P0 Backup Preflight

## Metadata
- Timestamp: 2026-03-02T10:22:00-06:00
- Host STAGING: db.qavydvbigwyyksaqgeci.supabase.co
- Host DRYRUN: db.bykumuizmxsclsazeych.supabase.co (PROD)
- Método conexión usado: Direct Connection URI con contraseña proporcionada (`Coronadanae020515`)

## Validaciones
- pg_dump versión: `pg_dump (PostgreSQL) 18.3`
- psql versión: `psql (PostgreSQL) 18.3`
- STAGING Connection: `FATAL: no se pudo traducir el nombre "db.qavydvbigwyyksaqgeci.supabase.co" a una dirección: Name or service not known`
- DRYRUN Connection: `FATAL: no se pudo traducir el nombre "db.bykumuizmxsclsazeych.supabase.co" a una dirección: Name or service not known`

## Resultado
- Resultado preflight: Las URIs de conexión directa proporcionadas no pueden ser resueltas por el DNS (Supabase desactivó las conexiones directas antiguas no-IPv4/IPv6-pooler u ocurrió un problema de red en el host local).
- PASS / FAIL: FAIL

## Detalle del Error (FAIL-CLOSED)
1. **Error de Conexión (CRÍTICO)**: Los hosts `db.[ref].supabase.co` no resuelven. Debe usarse el Session Pooler (`aws-0-[region].pooler.supabase.com`) si la base de datos se encuentra en la nueva infraestructura IPv4 de Supabase.
2. **Violación de Entorno (CRÍTICO)**: El objetivo "Supabace toolcrib" proporcionado sigue haciendo referencia al proyecto `bykumuizmxsclsazeych`, que es el entorno de PRODUCCIÓN. Las instrucciones estrictas prohíben tocar PROD y exigen un "Nuevo proyecto Supabase temporal" para restaurar el Dry Run. Se aborta ejecución para proteger producción.

Ejecución detenida en cumplimiento del protocolo FAIL-CLOSED.
