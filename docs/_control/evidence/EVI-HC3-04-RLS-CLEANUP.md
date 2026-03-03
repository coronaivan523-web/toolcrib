# EVI-HC3-04-RLS-CLEANUP

## 1. Inventario: Políticas Detección (`Enable`, `Allow`, `all users`, etc)
Durante el escaneo estático de migraciones y la evaluación proyectada contra el entorno Staging de DB, se identificaron inyecciones heredadas que abren huecos de visibilidad y escritura no validada. Estas políticas fueron priorizadas para su limpieza debido a que comprometen el aislamiento por Planta.

**Hallazgos Críticos Identificados:**
- **Tablas maestras (Public Read Absoluto):** `profiles`, `locations` (`"Enable read access for all users"`).
- **Módulo Cíclico y Requisiciones (Bypass total):** `cycle_count_lines`, `cycle_count_sessions`, `requisition_approvals`, `requisition_attachments`  (`"Enable all access for authenticated users"` / `"Allow all auth"`).
- **Módulo Tickets (Bypass):** `ticket_items` (`"Enable all access for authenticated users"`).
- **Trazabilidad Abierta:** `material_events` (`"Material events are viewable by everyone"`).

>*Nota Técnica: No se listaron o afectaron políticas que contengan explícitamente barreras por Roles internos de base (e.g. `role IN ('admin', 'supervisor')`), ya que estas entran en un scope distinto de validación.*

## 2. Desarrollo de la Solución Transaccional (Migración)
Se consolidó una única migración de estructura pasiva orientada exclusivamente al borrado de políticas obsoletas sin destruir esquemas o tablas. 

**Script Emitido:**
`supabase/migrations/20260302_rls_cleanup_global.sql`

Contiene una fila de instrucciones concatenadas `DROP POLICY IF EXISTS [Nombre] ON public.[Tabla]` asegurando que la corrida sea idempotente. 

## 3. Condiciones de Validación Post-Migración (STAGING)

Una vez el SysAdmin aplique el script en consola/interfaz de Staging, **SE DEBE CORRER** un Double-Check transaccional extraído del esquema del Prompt:

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND (
    policyname ILIKE '%Enable%' OR
    policyname ILIKE '%Allow%' OR
    policyname ILIKE '%all users%' OR
    policyname ILIKE '%everyone%' OR
    policyname ILIKE '%authenticated users%'
);
```
**Resultado Esperado:** 
El retorno deberá estar excluido completamente de políticas estructurales permisivas cruzadas (a excepción de aquellas que posean cláusulas defensivas robustas integradas al cuerpo `USING/WITH CHECK`). De existir remanentes que concedan `(true)`, deberán purgarse individualmente apuntando al modelo de aislamiento Zero-Trust de la Fase 3 previa.

Rama Destino (Pull/Aislada): `feature/hardening-core-v2`.
