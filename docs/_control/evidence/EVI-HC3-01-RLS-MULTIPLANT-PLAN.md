# EVI-HC3-01-RLS-MULTIPLANT-PLAN

## 1. Estado Actual
El sistema ToolCrib se encuentra en una etapa transicional hacia la segregación multicentro (Multi-planta) y el modelo Zero-Trust. Históricamente, numerosos endpoints se apoyaban en el bypass de Row Level Security (RLS) mediante el uso extensivo de `supabase_admin` (Service Role Key). En el modelo actual, la discriminación de recintos físicos depende de una columna de texto (`plant`) en lugar de una entidad fuerte (`plant_id`), limitando el enforcement automatizado en Base de Datos.

## 2. Hallazgos Service Role (A Eliminar)
Se ejecutó un barrido en el backend buscando `supabase_admin`, `SUPABASE_SERVICE_KEY`, y llamadas `.auth.admin`.

### Dependencias Inyectadas en Inicialización
- **`app/core/config.py:11`**: Carga de variable de entorno `SUPABASE_SERVICE_KEY`.
- **`app/core/supabase.py:14`**: Inicialización del singleton `supabase_admin`.

### Dependencias Transaccionales Críticas (A reemplazar por RLS+RPC)
- **`app/services/inventory_service.py:12` / `55`**: Uso directo de `supabase_admin` para inyectar transacciones en la red y ejecutar el RPC de ledger shadow.
  - *¿Es reemplazable?* SÍ. Al haber implementado en HC-2 el patrón atómico RPC, se puede eliminar si se habilita al rol del operador invocar los RPC requeridos.
- **`app/api/v1/endpoints/materials.py:20, 32, 71, 117...`**: Uso sistemático de `supabase_admin` para hacer `.select()` exhaustivos para reportes (ignorando la visibilidad real del operador).
  - *¿Es reemplazable?* SÍ. Configurando políticas de SELECT para Authenticated users según su `plant`. 

### Dependencias Auth Admin (Casos de Borde)
- **`app/api/v1/endpoints/users.py:107, 216, 289, 332...`**: El panel de administración utiliza las funciones exclusivas `.auth.admin.create_user`, `.update_user_by_id`, y `.generate_link`. 
  - *¿Es reemplazable?* NO directamente por RLS. Supabase Auth Management RESTRICT API exige Service Role. *Se debe conservar y encapsular aislando el cliente administrativo del resto del sistema operativo.*

## 3. Estado RLS por Tabla
Análisis de la carpeta de migraciones (`supabase/migrations/*.sql`):

- **`materials`**: RLS ON. Posee múltiples políticas segregadas por rol admin vs auth. *Problema: La política `Authenticated can view materials` es pasiva (ve todos).*
- **`inventory_movements`**: RLS ON. `Authenticated can create movements`. *Problema: Permite inserción a todos sin enforcement paramétrico.*
- **`requisitions` / `requisition_items`**: RLS ON. Tienen políticas más estrictas con Security Definer en algunos flujos.
- **`cycle_count_sessions` / `lines`**: RLS ON. `Enable all access for authenticated users`. *Problema: Extremadamente permisivo.*
- **`tickets`**: RLS ON.

**¿ENFORCE PLANT_ID?** NO.
Ninguna política RLS en el sistema Toolcrib inyecta un filtro obligatorio `WHERE plant = auth.jwt()->>'plant'` al consultar las tablas.

**Riesgo:** Un empleado autenticado de Planta A puede, inspeccionando la API, consultar y modificar (`inventory_movements`) materiales de Planta B al inyectar un ID distinto, ya que no existe un límite de inquilino (Tenant Isolation).

## 4. Multi-Planta (`plant_id` Coverage)
- **Hallazgo Crítico:** El sistema NO usa `plant_id` (UUID o Int relacional). Usa una columna de texto llano llamada **`plant`** (ej. "Planta 1") inyectada estáticamente en migraciones previas.
- Tablas que poseen `plant`: `materials`, `tickets`, `ticket_items`.
- **Tablas HUÉRFANAS de planta:** `inventory_movements`, `cycle_count_sessions`, `cycle_count_lines`, `requisitions`. (Asumen implícitamente la planta del material padre).

## 5. Modelo de Roles y Permisos (`deps.py` & Claims)
La identidad en el API de FastAPI se construye mediante validación en `deps.py`.

- **Mecanismo:** El token JWT es validado y decodificado por el SDK (`client.auth.get_user(token)`).
- **Extracción de Rol:** El sistema busca si existe un claim personalizado o perfil en bd. *Nota: Recientemente (Identity Decouple v7.3), se unificó la lectura hacia `client.auth.get_user()`, eliminando pánicos de parseo manual JWT, pero se debe verificar si la estructura JWT de Supabase contiene realmente los custom claims de planta y rol.*

### Matriz Mínima Esperada para Fase 2:
- **OPERADOR (Toolcrib / Floor):**
  - SELECT a materiales (solo de su planta).
  - INSERT movimientos (solo de su planta).
  - ZERO acceso a borrar o modificar perfiles.
- **SUPERVISOR / PLANNER:**
  - Idem Operador + UPDATE requisiciones / conteos cíclicos de su planta.
- **GLOBAL ADMIN:**
  - Rypass RLS para usuarios. Acceso a Data Maestro de todas las plantas.

## 6. Gaps y Severidad

- **[CRÍTICO] Ausencia de Aislamiento Tenant RLS:** No existen condiciones `plant = (auth.jwt()->>'app_metadata')::json->>'plant'` en las políticas SELECT/UPDATE/INSERT de ninguna tabla central de bodega.
- **[CRÍTICO] `inventory_movements` huerfano de Planta:** Al no tener columna `plant` el movimiento de Kardex, obligaría al RLS a hacer JOINs caros en PostgreSQL.
- **[ALTO] RLS Ultra-Permisivo:** Tablas como `cycle_count_sessions` poseen "ALL access for auth users". Permitiendo sabotaje inter-empleados de bajo nivel.
- **[MEDIO] Tipado Fuerte de Recintos:** `plant` al ser `text` es vulnerable a typos ("Planta1" vs "Planta 1"), rompiendo el RLS estricto.

## 7. Condiciones de "GO" (Requisitos post-Plan para Implementación)
1. Estandarizar si se usará `plant` (Text Enum) de forma nativa en JWT app_metadata.
2. Inyectar columna `plant_id` o `plant` text a `inventory_movements` y `requisitions` preventivamente.
3. Actualizar JWT Sync hook en Supabase para empaquetar `{ "plant": "Planta 1", "role": "operator" }` en authtoken.
4. Generar script DDL que altere (DROP/CREATE) las `policies` actuales sobreescribiendo por versiones Segregadas por JWT.
