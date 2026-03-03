# INYECCIÓN CLAIM PLANT — DIAGNÓSTICO
**Alcance:** STAGING Environment
**Objetivo:** Diseño de mecanismo para forzar el claim `plant` en Supabase Auth JWTs.

## FASE A — DIAGNÓSTICO
1. **Generación actual de JWT:** 
   El sistema ToolCrib utiliza Supabase Auth de forma *nativa en formato Proxy*. El endpoint `POST /api/v1/auth/login` invoca directamente `supabase.auth.sign_in_with_password()`. El backend recibe el JWT inalterado desde el motor GoTrue de Supabase y lo devuelve íntegro al frontend. No existe Edge Function ni middleware Gateway inyectando claims en este momento.

2. **Existencia de tabla `user_plants` o equivalente:**
   **NO EXISTE.** Una revisión extensiva del schema público bajo `supabase/migrations` revela que la asignación de tenant por planta es actualmente un vacío estructural. No hay tablas pivote asociando `user_id` <-> `plant_id`.

3. **Existencia de `plant` en `profiles`:**
   **NO EXISTE.** La sentencia de creación de `profiles` no contiene columnas alusivas a planta, lo cual genera que el login recupere roles pero no identifique procedencia física del usuario.

## FASE B — PROPUESTA TÉCNICA

### OPCIÓN RECOMENDADA
**Opción B (app_metadata injection)**
*¿Por qué?* Supabase GoTrue soporta claims personalizados directamente inyectados en el campo `app_metadata` mediante comandos administrativos (RPC / backend de alta confianza). Si se usa `user_metadata` (Opción A), el cliente frontend podría modificar maliciosamente su propia asignación de planta vía endpoint `/auth/v1/user`, bypasseando el RLS. Usar `app_metadata` asegura que solo el rol administrador pueda vincular la tenencia.

**Propuesta Concreta:** 
1. Estructurar DB: Alterar la tabla `profiles` para incluir la columna `plant (text)` definiendo la planta matriz del trabajador.
2. Sincronización Backend: Modificar los controladores de Administración de Usuarios (`app/api/v1/endpoints/users.py`) en `create_user` y `update_user` para propagar este campo al bloque Inmutable de Supabase `auth.users(app_metadata)`.
3. Inyección NATIVA de JWT: Al autenticarse normalmente, los claims serializarán inmutablemente en el Token firmado. No se requieren Gateways pesados (Opción C).

### IMPACTO EN HC-4
- **Conformidad Transparente:** La migración RLS `auth.jwt()->>'plant'` y el Role Gate Python de las fases previas funcionarán el mismo día sin adaptaciones ya que consultan esta matriz de claims.

### RIESGOS
- **Bloqueo Inminente (Blackout de Staging):** Dado el Enforcement existente (403 si `plant` es vacío), sin un script transitorio de backfill (Relleno Masivo DB + Metadatos), TODOS LOS 11 USUARIOS estarán indefinidamente expulsados de `auth.users`.
- **Modificación API Menú Roles:** Las interfaces frontend ligadas a la API `PUT /users/:id` deberán comenzar a despachar dinámicamente el payload JSON conteniendo `"plant": "..."`.
