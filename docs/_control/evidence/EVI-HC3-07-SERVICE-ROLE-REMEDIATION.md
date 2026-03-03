# EVI-HC3-07-SERVICE-ROLE-REMEDIATION

## 1. Alcance de Remediación
Bajo el protocolo *Fail-Closed*, se intervinieron categóricamente los controladores públicos que operaban bajo elevación de privilegios (`SUPABASE_SERVICE_ROLE_KEY`) o con el cliente genérico de librería (`supabase`), lo cual esterilizaba las reglas de Row Level Security (RLS) en base de datos al realizar lecturas anónimas o con privilegios máximos.

## 2. Inyección de Interceptor JWT (Strict Role & Tenant Binding)
Se inyectó en los módulos críticos una función interceptora encargada de desensamblar el payload del token provisto por la capa de dependencias de OAuth/Session, decodificando el `app_metadata` y validando imperativamente la existencia del atributo `plant`. En caso de carecer de membresía a una planta (como en el caso de tokens alterados o en un entorno mal configurado), interrumpe el flujo web inmediatamente con error 403 Forbidden.

La función retorna una instancia efímera de `SupabaseClient` forjada en memoria exclusivamente con la cabecera `Authorization: Bearer <Token_Original>`, cediendo enteramente la última capa defensiva y de filtrado al motor PostgreSQL RLS.

## 3. Matriz de Remediación (Reporte Final)

| Archivo | Cambio aplicado | `SERVICE_ROLE` eliminado | RLS Activo (PostgREST) | PASS/FAIL |
|---|---|---|---|---|
| `app/api/v1/endpoints/materials.py` | Sustituido inyector recursivo `supabase_admin` por `get_user_client()`. Rutas CRUD resguardadas con el claim token del endpoint actual. | SÍ | SÍ | **PASS** |
| `app/services/inventory_service.py` | Eliminado `supabase_admin` dentro del delegado transaccional. El cliente `rpc` ahora opera usando el rol real del usuario inyector validando constraint de `plant`. | SÍ | SÍ | **PASS** |
| `app/api/v1/endpoints/inventory.py` | Reemplazado cliente global `supabase` en lectura de ubicaciones y kardex. Reestructurada la invocación del servicio para pasar variable del token JWT integralmente. | N/A (Era Anon) | SÍ | **PASS** |

## 4. Veredicto Confirmatorio
El esquema de evasión sobre las defensas RLS Multi-Planta ha sido exitosamente subsanado mediante arquitectura modular en STAGING para el dominio núcleo de Inventario y Catálogos de Material. Ningún endpoint público mantiene contacto transaccional asumiendo identidad administrativa de sistema.
