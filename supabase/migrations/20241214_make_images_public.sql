-- Script: Optimizar carga de imágenes (Hacer bucket público)
-- Ejecuta esto para evitar que el sistema tenga que "firmar" cada imagen una por una (lo que causa la lentitud).

-- 1. Hacer público el bucket 'material-images'
UPDATE storage.buckets
SET public = true
WHERE id = 'material-images';

-- 2. Asegurar política de lectura pública
DROP POLICY IF EXISTS "Authenticated users can view material images" ON storage.objects;
DROP POLICY IF EXISTS "Public View" ON storage.objects;

CREATE POLICY "Public View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'material-images' );
