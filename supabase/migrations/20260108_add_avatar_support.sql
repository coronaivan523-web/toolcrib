-- Migration: Add Avatar Support
-- Date: 2026-01-08
-- Purpose: Add avatar_url to profiles and create avatars storage bucket

-- 1. Add avatar_url column to profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
END $$;

-- 2. Create 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for 'avatars' bucket

-- Policy 1: Public Read Avatars (Anyone can view avatars)
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy 2: User can Upload their own avatar
-- We enforce that the filename must start with the user's ID
DROP POLICY IF EXISTS "User Upload Own Avatar" ON storage.objects;
CREATE POLICY "User Upload Own Avatar"
ON storage.objects FOR INSERT
With CHECK (
    bucket_id = 'avatars' AND
    auth.uid() = owner AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: User can Update their own avatar
DROP POLICY IF EXISTS "User Update Own Avatar" ON storage.objects;
CREATE POLICY "User Update Own Avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND
    auth.uid() = owner AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: User can Delete their own avatar
DROP POLICY IF EXISTS "User Delete Own Avatar" ON storage.objects;
CREATE POLICY "User Delete Own Avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND
    auth.uid() = owner AND
    (storage.foldername(name))[1] = auth.uid()::text
);
