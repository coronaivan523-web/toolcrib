-- Script: Asegurar Esquema de Base de Datos (Fix All)
-- Ejecuta esto para garantizar que todas las columnas y tablas necesarias existen.
-- También recarga el caché de esquema de la API.

-- 1. Asegurar columnas en 'materials'
DO $$
BEGIN
    -- material_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'material_type') THEN
        ALTER TABLE public.materials ADD COLUMN material_type text;
    END IF;

    -- abc_class
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'abc_class') THEN
        ALTER TABLE public.materials ADD COLUMN abc_class text;
    END IF;

    -- origin_country
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'origin_country') THEN
        ALTER TABLE public.materials ADD COLUMN origin_country text;
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'status') THEN
        ALTER TABLE public.materials ADD COLUMN status text DEFAULT 'active';
    END IF;

    -- image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'image_url') THEN
        ALTER TABLE public.materials ADD COLUMN image_url text;
    END IF;
    
    -- deactivated info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'deactivated_at') THEN
        ALTER TABLE public.materials ADD COLUMN deactivated_at timestamptz;
        ALTER TABLE public.materials ADD COLUMN deactivated_by uuid; -- removed constraint to be safe or use text? keeping uuid/text looseness in mind. Let's stick to uuid for now or text if we want flexibility. The previous script used uuid.
        ALTER TABLE public.materials ADD COLUMN deactivation_reason text;
    END IF;

    -- FIX: requested_by must be TEXT now (as per recent change)
    -- We check if it exists. If it exists as UUID, we convert it.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'requested_by' AND data_type = 'uuid') THEN
         -- Drop constraint if exists
         ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_requested_by_fkey;
         ALTER TABLE public.materials ALTER COLUMN requested_by TYPE text USING requested_by::text;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'requested_by') THEN
         ALTER TABLE public.materials ADD COLUMN requested_by text;
    END IF;

     -- registered_by (keep as uuid or text? typically uuid for system user)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'registered_by') THEN
        ALTER TABLE public.materials ADD COLUMN registered_by uuid;
    END IF;

END $$;

-- 2. Asegurar tabla 'material_events'
CREATE TABLE IF NOT EXISTS public.material_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id bigint REFERENCES public.materials(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    performed_by uuid,
    requested_by text, -- Relaxed to text
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 3. Recargar el caché de esquema (Importante para el error "schema cache")
NOTIFY pgrst, 'reload schema';
