# DISEÑO TENANT FORMAL

## Tablas Propuestas
Se requiere abandonar el hardcoding de tipos `text` descubiertos en fases previas e implementar un modelo relacional robusto.

1. **`public.plants` (Catálogo Maestro de Tenants)**
   - Almacena la entidad corporativa.
   - Columnas: `id` (UUID/Serial), `code` (VARCHAR, ej. 'WXM', 'WTX' - Usado como Tenant Identifier actual), `name` (VARCHAR), `is_active` (BOOLEAN), `created_at`.
   - Llave Primaria: `id`.
   - Unique: `code`.

2. **`public.user_plants` (Matriz de Asignación Many-to-Many)**
   - Vincula usuarios (Profiles) con Plantas. Permite que un Supervisor o Admin audite múltiples plantas.
   - Columnas: `user_id` (UUID - ref: auth.users/profiles), `plant_id` (UUID - ref: plants.id), `is_primary` (BOOLEAN), `created_at`.
   - Llave Primaria Compuesta: `(user_id, plant_id)`.
   - Funcionalidad: Determina qué plantas *puede* ver un usuario, y cuál es su planta *activa* (primary) que será inyectada en el JWT (`app_metadata.plant`).

## Relaciones & Dependencias (SQL Draft)
Para evitar corromper los esquemas actuales que usan `plant (text)`, el `plant_id` o el `code` debe ser referenciado. Como `materials.plant` e `inventory_movements.plant` usan texto, se creará una FK hacia `plants.code`.

```sql
-- DRAFT SQL (No ejecutar)
CREATE TABLE public.plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_plants (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plant_code VARCHAR(10) NOT NULL REFERENCES public.plants(code) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, plant_code)
);

-- Constraint para limitar a 1 planta primaria por usuario
CREATE UNIQUE INDEX idx_user_plants_primary ON public.user_plants (user_id) WHERE is_primary = TRUE;

-- Amarrar las tablas existentes al nuevo catálogo (Hardening de Integridad)
ALTER TABLE public.materials 
    ADD CONSTRAINT fk_materials_plant FOREIGN KEY (plant) REFERENCES public.plants(code) ON DELETE RESTRICT;

ALTER TABLE public.inventory_movements 
    ADD CONSTRAINT fk_movements_plant FOREIGN KEY (plant) REFERENCES public.plants(code) ON DELETE RESTRICT;
```

## Índices
Para asegurar resolución ultrarrápida en el filtrado y cruces RLS:
- `CREATE INDEX idx_plants_code ON public.plants(code);`
- `CREATE INDEX idx_user_plants_user ON public.user_plants(user_id);`
- `CREATE INDEX idx_user_plants_plant ON public.user_plants(plant_code);`
- El índice implícito en `(user_id)` con filtro `is_primary` optimizará la extracción para inyección JWT.

## Impacto en RLS
- **`inventory_movements` / `materials`**: Gran nulo impacto si se sigue usando el claim matricial `auth.jwt()->>'plant'` con el valor en texto (ej. `WXM`). Las FKs garantizan que no existan valores huérfanos, pero el RLS policy per-sé dictaminada en HC-4 Fase 2 no requiere refactorizarse de inmediato.
- **Cross-Plant Auth**: Si a futuro se requiere acceso simultáneo a múltiples plantas de las que el usuario es miembro (sin reloguear cambiando la planta activa), el RLS podría escalar a usar un sub-select seguro hacia `user_plants` o decodificar un array JSON desde el JWT `auth.jwt()->>'allowed_plants'`. Por ahora, la inyección simple (Primary Plant) basta.

## Riesgos y Estrategia de Backfill
**Riesgos:**
1. **Orfandad de Datos (Data Blackout)**: Si hay un registro existente en `materials` con una planta como ` 'PLANT_A' ` que no se da de alta en el catálogo `plants` antes del constraint, todo el ALTER TABLE fallará explosivamente.
2. **Lockout Global**: Los 11 usuarios actuales perderán el acceso 100% transaccional debido a la falta de FK en `user_plants` o `app_metadata`.

**Estrategia de Backfill para los 11 Usuarios Actuales:**
1. **Migración de Pre-Vuelo:**
   - Hacer un `SELECT DISTINCT plant FROM public.materials UNION SELECT DISTINCT plant FROM public.inventory_movements;`
   - Insertar automáticamente cada resultado de texto en la nueva tabla `plants` (ej. code = 'DEFAULT', name = 'Default Plant').
2. **Asignación Default:**
   - Insertar forzadamente a los 11 UUIDs de `profiles` en `user_plants` asociándolos a la planta detectada o a una planta por defecto ('HQ'), fijando `is_primary = TRUE`.
3. **RPC de Inyección JWT:**
   - Correr en el backend un script one-off usando `supabase_admin` que itere sobre `user_plants` y ejecute `admin.update_user_by_id(u.user_id, {"app_metadata": {"plant": u.plant_code}})` para parchear a los 11 usuarios antes de activar el Constraint de la DB.
4. **Deploy de FK:** Aplicar las dependencias estructurales en las tablas transaccionales.
