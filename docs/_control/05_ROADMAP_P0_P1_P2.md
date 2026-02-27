# 05 ROADMAP (P0, P1, P2)

Hoja de ruta estratégica para estabilización y escalado de ToolCrib Corporativo. **Cada iteración exige evidencia en _control.**

## FASE P0: IDENTITY DECOUPLING (ESTABILIZACIÓN CORE)
**Objetivo:** Permitir clonación completa y aislar el schema `public` de `auth.users` para desatorar DevOps.

1. **Evaluar alcance:** Identificar todas las dependencias (`public` -> `auth.users`).
2. **Snapshot Baseline:** Extraer estado de profiles existentes.
3. **Drop FKs:** Remover restricciones físicas (`REFERENCES auth.users(id)`).
4. **Target FKs:** Apuntar restricciones a tabla esclava (ej. `public.profiles` o una nueva `public.app_users`).
5. **Auditoría:** Probar de manera intensiva clonación (simular `pg_dump` local).
* [ ] **DoD (Definition of Done):** Clon `pg_dump`/`pg_restore` funciona sin errores y la aplicación frontend arranca local sin chocar permisos.*

## FASE P1: TENANT ISOLATION Y RED (SEGURIDAD GLOBLAL)
**Objetivo:** Preparar "Un solo cerebro, múltiples brazos". Aislar por `plant_id`. Cerrar API.

1. **Estructura Multi-Planta:** Crear diccionario corporativo `plants`/`locations_master`.
2. **Data Model:** Añadir (o reforzar) `plant_id` forzoso a transacciones.
3. **Identity Sync:** Cada perfil/usuario se ata criptográficamente a uno o más `plant_id`.
4. **RLS Hardening:** Escribir políticas para validar `(auth.jwt()->>'app_plant_id') = table.plant_id`.
5. **Network Shielding:** Cerrar CORS en `main.py`, eliminar logueos crudos PII in middleware.
* [ ] **DoD:** Usuario de Planta "A" no puede hacer SELECT indirecto del Kardex de Planta "B" por ningún vector. API devuelve 403 o arreglo vacío.*

## FASE P2: INTERNACIONALIZACIÓN (I18N READY) Y BACKEND PROXY
**Objetivo:** Ser un SaaS interno genuino. Preparar salto final fuera de PostgREST.

1. **Diccionarios Dinámicos:** Mapeo de UI en frontend (español, chino, inglés).
2. **Normalización Timezones:** Guardar UTC, recuperar LocalTime(Client) o forzar LocalTime(Plant).
3. **Capa Red Frontend:** Reemplazar `supabase-js` `select()` por llamadas a FastAPI (Rutas proxy).
* [ ] **DoD:** El usuario cambiará idioma/región y UI / Reportes adaptarán lenguaje y huso horario.*
