# EVIDENCE: AUTH DEPENDENCIES EN SCHEMA PUBLIC

**ID Evidencia**: EVI-002
**Fecha**: 2026-02-27
**Generado Por**: Auditor Antigravity (FAIL-CLOSED)
**Metodología**: Grep/Búsqueda estática sobre los migrations `.sql` de ToolCrib.
**Veredicto**: HIGH COUPLING / NO-GO FOR CLONING.

## 1. FOREIGN KEYS HACIA `auth.users(id)`
Resultados del análisis (Se halló un alto grado de acoplamiento físico en las tablas del negocio).

**Tablas Impactadas:**
- `public.profiles` (Primary Key: `id uuid REFERENCES auth.users on delete cascade`)
- `public.materials` (`requested_by`, `registered_by`, `deactivated_by`)
- `public.material_events` (`performed_by`, `requested_by`)
- `public.tickets` (`requester_id`, `assigned_to`)
- `public.requisitions` (`requester_id`, `approver_id`, `gerente_mx_id`, `gerente_ch_id`, `gerente_gral_id`, `assigned_to_user_id`, `action_by_user_id`, `uploaded_by`)
- `public.inventory_ledger_v2` (`created_by`)
- `public.inventory_movements` (`created_by`)
- `public.messages` (`sender_id`, `recipient_id`)
- `public.notifications` (`sender_id`)
- `public.cycle_count_lines` (`counted_by`) -- Identificado en crasheos previos.

*Total Estimado: Mínimo 20+ FKs físicas sobre `auth.users`.*

## 2. USO DE `auth.uid()` EN POLÍTICAS RLS Y FUNCIONES
El sistema confía en la sesión de Supabase Auth en la capa de datos.

**Mecanismos Impactados:**
- **RLS (Profiles):** `USING (auth.uid() = id)`
- **RLS (Tickets):** `WITH CHECK (auth.uid() = requester_id)`
- **RLS (Requisitions):** Múltiples chequeos de permisos basados en `auth.uid() = requester_id` o validando roles iterando `FROM public.profiles WHERE id = auth.uid()`.
- **RLS (Storage):** Avatares y firmas (`(storage.foldername(name))[1] = auth.uid()::text`).
- **RPC/Triggers (`fix_hardening_final.sql`, `fix_kardex_rpc.sql`):** Funciones PL/pgSQL que verifican `auth.uid()` contra los perfiles: `SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();`

## 3. IMPACTO ARQUITECTÓNICO
La base de datos "Dumb DB" no se respeta. Supabase actúa como el cerebro de identidad insertado directamente en el núcleo relacional (`public`), lo que impide volcados independientes (clonación V7.x) y ata el software al PaaS. 
La desasociación (P0) debe reemplazar las **FKs físicas**, permitiendo que `auth.uid()` siga alimentando el **RLS (seguridad lógica)** mediante el JWT, sin restringir la estructura relacional.
