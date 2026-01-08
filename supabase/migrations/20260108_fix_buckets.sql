
-- Migration: Fix Buckets
-- Date: 2026-01-08
-- Purpose: Ensure signatures and avatars buckets exist

INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure RLS is enabled for objects (default, but good to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
