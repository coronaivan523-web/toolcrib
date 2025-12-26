-- Ensure bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'material-images';

-- Ensure it exists (if somehow deleted)
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-images', 'material-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies
-- Drop existing to avoiding conflicts/duplicates (safe for this bucket)
-- Note: You might want to be more specific if other policies exist, but these names are standardizing.
DROP POLICY IF EXISTS "Public Read Material Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Material Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload material images" ON storage.objects; -- Drop old name
DROP POLICY IF EXISTS "Authenticated users can view material images" ON storage.objects; -- Drop old name

-- Create Public Read
CREATE POLICY "Public Read Material Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'material-images');

-- Create Authenticated Insert
CREATE POLICY "Authenticated Upload Material Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'material-images');

-- Create Authenticated Update (just in case)
CREATE POLICY "Authenticated Update Material Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'material-images');
