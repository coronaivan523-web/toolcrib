-- Script: Crear Bucket de Almacenamiento (Force)
-- Ejecuta esto en el Editor SQL de Supabase para corregir el error "Bucket not found".

-- 1. Crear el bucket 'material-images' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-images', 'material-images', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Asegurar que la política de INSERT (Subida) existe
DROP POLICY IF EXISTS "Authenticated users can upload material images" ON storage.objects;
CREATE POLICY "Authenticated users can upload material images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'material-images');

-- 3. Asegurar que la política de SELECT (Ver) existe
DROP POLICY IF EXISTS "Authenticated users can view material images" ON storage.objects;
CREATE POLICY "Authenticated users can view material images" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'material-images');

-- 4. (Opcional) Permitir acceso público si prefieres no usar URLs firmadas
-- UPDATE storage.buckets SET public = true WHERE id = 'material-images';
