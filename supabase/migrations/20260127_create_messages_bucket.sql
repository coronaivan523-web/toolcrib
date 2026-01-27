-- Create 'messages' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Policy for Upload (INSERT) - Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload messages" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'messages');

-- Policy for View (SELECT) - Allow authenticated users to view
DROP POLICY IF EXISTS "Authenticated users can view messages" ON storage.objects;
CREATE POLICY "Authenticated users can view messages" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'messages');
