# EVI-HC3-03-RLS-HARDENING

## 1. Fase 0: Preflight (Políticas Actuales Identificadas)
Al auditar los esquemas en base al repositorio, las tablas clave conservaban políticas sin filtros geográficos (`plant`), basadas puramente en la validación `TO authenticated USING (true)`.

**Políticas identificadas y marcadas para purga:**
- `materials`: `"Authenticated can view materials"`
- `materials`: `"Enable read access for all users"` (Legacy)
- `inventory_movements`: `"Authenticated can view movements"`
- `inventory_movements`: `"Authenticated can create movements"`

## 2. Archivo Generado (Staging Only)
- **Ruta:** `supabase/migrations/20260302_rls_hardening_multi_plant.sql`

## 3. Acciones de Endurecimiento (Fase 1 a 4)

- **Aseguramiento RLS:** Se forzó `ENABLE ROW LEVEL SECURITY` sobre las tablas `materials` e `inventory_movements`.
- **Limpieza DDL:** Se emitieron instrucciones `DROP POLICY IF EXISTS` apuntando a las políticas globales defectuosas.
- **Strict Isolation (Lectura y Escritura):**
  Se inyectaron 3 políticas nuevas que extraen el atributo físico (`plant`) del app_metadata/user_metadata embutido en el token criptográfico que recibe PostgREST:
  
  ```sql
  -- Lectura Estricta de Catálogo
  CREATE POLICY plant_isolation_materials
  ON public.materials FOR SELECT
  USING (plant = auth.jwt() ->> 'plant');
  
  -- Lectura Estricta de Kardex
  CREATE POLICY plant_isolation_movements
  ON public.inventory_movements FOR SELECT
  USING (plant = auth.jwt() ->> 'plant');
  
  -- Inserción Limitada por Muro
  CREATE POLICY plant_insert_movements
  ON public.inventory_movements FOR INSERT
  WITH CHECK (plant = auth.jwt() ->> 'plant');
  ```

## 4. Estado Final de la Petición
- **Rama:** `feature/hardening-core-v2`
- **Condición Actual:** Operación preparada y estática como SQL Migration (Cumpliendo Zero Touch on DB & No Destructivo).
- **Dependencia futura:** Todo token JWT emitido desde Auth hacia el Client deberá contener la llave `plant` ("Planta 1", "Planta 2", etc.) para no devolver pánico/arreglos vacíos de la DB.
