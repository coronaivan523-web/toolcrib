-- Reparación de la columna Area
-- Ejecutar en Supabase SQL Editor

DO $$
BEGIN
    -- 1. Si existe 'area_deprecated' y 'area' está vacío, copiar datos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'area_deprecated') THEN
        UPDATE materials 
        SET area = area_deprecated 
        WHERE (area IS NULL OR area = '') AND (area_deprecated IS NOT NULL AND area_deprecated <> '');
    END IF;

    -- 2. Si existe "Area" (caso mixto) y 'area' está vacío, copiar datos
    -- Nota: Puede fallar si "Area" ya fue renombrado, por eso el paso 1 es clave.
    -- Pero intentamos por si acaso el paso anterior falló o no se ejecutó.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'Area') THEN
        UPDATE materials 
        SET area = "Area" 
        WHERE (area IS NULL OR area = '') AND ("Area" IS NOT NULL AND "Area" <> '');
    END IF;
END $$;

-- Verificar resultados
SELECT count(*) as total_materials, 
       count(area) as with_area, 
       count(area_deprecated) as with_deprecated 
FROM materials;
