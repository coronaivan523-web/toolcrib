-- Migration: Add Signature Support
-- Date: 2026-01-08
-- Purpose: Add signature_url to profiles and create signatures storage bucket

-- 1. Add signature_url column to profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'signature_url') THEN
        ALTER TABLE public.profiles ADD COLUMN signature_url text;
    END IF;
END $$;

-- 2. Create 'signatures' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for 'signatures' bucket

-- Policy 1: Public Read Access (Anyone can view signatures)
DROP POLICY IF EXISTS "Public Read Signatures" ON storage.objects;
CREATE POLICY "Public Read Signatures"
ON storage.objects FOR SELECT
USING ( bucket_id = 'signatures' );

-- Policy 2: User can Upload their own signature
-- We enforce that the filename must start with the user's ID to prevent overwriting others
DROP POLICY IF EXISTS "User Upload Own Signature" ON storage.objects;
CREATE POLICY "User Upload Own Signature"
ON storage.objects FOR INSERT
With CHECK (
    bucket_id = 'signatures' AND
    auth.uid() = owner AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: User can Update their own signature
DROP POLICY IF EXISTS "User Update Own Signature" ON storage.objects;
CREATE POLICY "User Update Own Signature"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'signatures' AND
    auth.uid() = owner AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: User can Delete their own signature
DROP POLICY IF EXISTS "User Delete Own Signature" ON storage.objects;
CREATE POLICY "User Delete Own Signature"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'signatures' AND
    auth.uid() = owner AND
    (storage.foldername(name))[1] = auth.uid()::text
);
