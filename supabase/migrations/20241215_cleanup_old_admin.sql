-- Migration: Force remove old admin and reassign data
-- Created at: 2024-12-15 14:50:00

DO $$
DECLARE
    old_admin_id uuid;
    new_admin_id uuid;
BEGIN
    -- 1. Find the IDs
    SELECT id INTO old_admin_id FROM auth.users WHERE email = 'admin@toolcrib.com';
    SELECT id INTO new_admin_id FROM auth.users WHERE email = 'ivan.corona@wasion.cn';

    -- Check if both exist
    IF old_admin_id IS NOT NULL AND new_admin_id IS NOT NULL THEN
        
        -- 2. Reassign records (Materials)
        UPDATE public.materials 
        SET registered_by = new_admin_id 
        WHERE registered_by = old_admin_id;

        -- 2b. Reassign records (Material Events)
        UPDATE public.material_events 
        SET performed_by = new_admin_id 
        WHERE performed_by = old_admin_id;

        -- 3. Delete from profiles (if exists)
        DELETE FROM public.profiles WHERE id = old_admin_id;

        -- 4. Delete from auth.users (This removes the login)
        DELETE FROM auth.users WHERE id = old_admin_id;
        
        RAISE NOTICE 'Old user deleted and data reassigned successfully.';
    ELSE
        RAISE NOTICE 'Could not find both users. Please check emails.';
    END IF;
END $$;
