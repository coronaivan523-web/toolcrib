-- Script: Renombrar columna "Part Number" a "part_number"
-- El código espera "part_number" (snake_case) pero la base de datos tiene "Part Number" (con espacio).
-- Este script normaliza el nombre de la columna.

DO $$
BEGIN
    -- 1. Intentar renombrar "Part Number" si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'Part Number') THEN
        ALTER TABLE public.materials RENAME COLUMN "Part Number" TO part_number;
    END IF;

    -- 2. Intentar renombrar "Part Numer" (posible error de dedo) si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'Part Numer') THEN
        ALTER TABLE public.materials RENAME COLUMN "Part Numer" TO part_number;
    END IF;
    
    -- 3. Confirmación: asegurar que part_number existe ahora
    -- Si no existía ninguna de las anteriores, lo creamos para evitar errores futuros
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'part_number') THEN
        ALTER TABLE public.materials ADD COLUMN part_number text;
    END IF;

    -- 4. Recargar el caché de esquema
    NOTIFY pgrst, 'reload schema';
END $$;
