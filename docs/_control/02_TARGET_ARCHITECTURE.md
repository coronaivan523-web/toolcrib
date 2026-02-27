# 02 TARGET ARCHITECTURE: EL CASTILLO CORPORATIVO

## VISIÓN GENERAL (MODELO A - ÚNICA EMPRESA, MÚLTIPLES PLANTAS)
La arquitectura objetivo transiciona de una aplicación severamente acoplada a un modelo empresarial con **Backend Gateway Fuerte**, abstracción de base de datos y aislamiento interno entre plantas.

## PILARES DEL REDISEÑO ESTRUCTURAL

### 1. IDENTIDAD ABSTRAÍDA (INDEPENDIENTE DE IAM)
- **Target:** Supabase Auth se vuelve un simple "Identity Provider" (IdP), como podría serlo Auth0, Entra ID o Keycloak en el futuro.
- **Mecanismo:** 
  - Eliminar todas las FKs que apuntan a `auth.users`.
  - Crear una tabla de identidad maestra: `public.app_users` (o renombrar/consolidar `profiles`).
  - El IdP sincroniza los IDs vía webhooks/eventos al crearse un usuario, pero todo el sistema transaccional (`tickets`, `materials`, `events`) apunta a `public.app_users(id)`.
- **Beneficio:** `pg_dump` del schema `public` es ahora 100% íntegro y restaurable en cualquier parte del mundo.

### 2. MULTI-TENANT POR PLANTA (ROW-LEVEL SECURITY ISOLATION)
- **Target:** Aislamiento criptográfico (a nivel DB) por región lógica.
- **Mecanismo:** 
  - Toda tabla transaccional implementará una columna estricta `plant_id` o `tenant_id` (vinculada a un diccionario de ubicaciones corporativas).
  - Las políticas RLS comprobarán: `auth.uid() IN (SELECT user_id FROM user_plants WHERE plant_id = target_table.plant_id)`.
  - Super Administradores globales tendrán un flag `is_global_admin = true`.
- **Beneficio:** Cero riesgo de que un empleado en China autorice requisiciones de material en México.

### 3. BACKEND AUTORITATIVO (API GATEWAY)
- **Target:** El frontend de React dejará de hacer fetch directo (PostgREST SDK) a las tablas.
- **Mecanismo:** FastAPI centraliza la capa de autorización, enrutamiento, i18n y escritura.
- **Beneficio:** Quita el "Vendor Lock-in". Si migramos a un Postgres On-Premise alojado por AWS RDS, el frontend de React nunca se enterará, pues solo consultará rutas REST del backend (`/api/v1/materials`).

### 4. ROADMAP SUPABASE -> POSTGRES ON-PREMISE (FUTURO)
El objetivo final a largo plazo es una DB corporativa on-premise.
Fases puente:
1. **Desacoplar SDK Frontend:** Pasar queries PostgREST a hooks que llamen a FastAPI.
2. **Re-conectar Backend:** FastAPI se conectará a la DB usando SQLModel/SQLAlchemy en lugar del `supabase-py` SDK.
3. **Migrar Storage:** Abstraer llamadas de Supabase Storage a Storage compatible S3 (MinIO, AWS S3).
4. **Desacoplar Realtime:** Reemplazar Realtime de Supabase por websockets nativos (FastAPI/Socket.io).
