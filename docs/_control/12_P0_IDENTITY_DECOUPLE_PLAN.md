# 12 P0 IDENTITY DECOUPLE PLAN (SHADOW MODE)

**Decisión**: DEC-XXX (Desacoplamiento progresivo de Identidad)
**Objetivo**: Eliminar **todas** las restricciones `REFERENCES auth.users(id)` del schema `public` SIN romper la aplicación React existente.

## EL PROBLEMA ACTUAL
Actualmente, cualquier fila en `tickets`, `requisitions` o `profiles` exige que el ID exista explícitamente en `auth.users` (una tabla oculta y propiedad absoluta del PaaS Supabase). Esto es la causa raíz de los fallos de clonación, pues `pg_dump` no puede extraer `auth.users`.

## ESTRATEGIA SHADOW MODE (SIN DOWNTIME)
La estrategia consiste en convertir la seguridad estructural (Foreign Keys) en seguridad lógica de la aplicación, asumiendo que el Frontend y el Endpoint (Supabase Auth/API) ya evitan la inserción de UUIDs falsos.

### Fase 1: Puente de Identidad
1. La tabla `public.profiles` actualmente tiene: `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
2. Conservaremos `public.profiles` como la "tabla maestra de usuarios de la aplicación", asumiendo que es un *Shadow Copy* confiable de `auth.users`.

### Fase 2: Ejecución (Drop FKs)
Mediante un script de migración, se ejecutarán `ALTER TABLE ... DROP CONSTRAINT` para TODAS las tablas de transacciones.
Ejemplo:
```sql
ALTER TABLE public.tickets DROP CONSTRAINT tickets_requester_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT tickets_assigned_to_fkey;
-- Y así sucesivamente para requisitions, inventory_ledger, messages, etc.
```

### Fase 3: Re-Asignación (Target public.profiles) [Opcional pero Recomendado]
Para mantener integridad relacional *local* (dentro del scope `pg_dump`), apuntaremos las referencias a la copia sombra:
```sql
ALTER TABLE public.tickets ADD CONSTRAINT fk_tickets_requester 
  FOREIGN KEY (requester_id) REFERENCES public.profiles(id);
```
*(Se repite para el resto).*

### Fase 4: Desacople Final de Profiles
Finalmente, romper el lazo entre `profiles` y `auth.users`:
```sql
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
```

## POR QUÉ FUNCIONARÁ SIN ROMPER EL CÓDIGO
1. **Frontend (React)**: No le importan las Foreign Keys. Envía el `uuid` del usuario logueado en sus peticiones POST/GET. Las columnas conservan el tipo de dato `UUID`. Todo funcionará idéntico.
2. **PostgREST / RLS**: Las políticas RLS usan `auth.uid()`, el cual es extraído mágicamente del token JWT (Bearer Token). El token sigue portando el UUID correcto. Las evaluaciones RLS (`USING auth.uid() = id`) seguirán dando `TRUE`, ya que los UUID coincidirán con los almacenados en las columnas (ahora sin FK física).

**Riesgo Remanente:** "Dangling Profiles". Si se elimina un usuario en `auth.users` desde el Dashboard de Supabase, ya no explotará un borrado en cascada (al remover la FK de `profiles`). Se debe manejar con borrado lógico o un webhook de sincronización futuro. Por ahora es un trade-off aceptable para curar la clonación.
