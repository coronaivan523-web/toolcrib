-- Create messages bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow authenticated uploads
CREATE POLICY "Authenticated users can upload messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages');

-- Policy to allow viewing
CREATE POLICY "Authenticated users can view messages"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'messages');
