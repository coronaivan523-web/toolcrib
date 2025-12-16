-- Fix & Verify Admin Role for Ivan Corona
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- 1. Get the User ID from Auth
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'ivan.corona@wasion.cn';

    IF target_user_id IS NOT NULL THEN
        -- 2. Ensure Profile Exists (Insert if missing)
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (target_user_id, 'ivan.corona@wasion.cn', 'Ivan Corona', 'admin')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin',
            full_name = 'Ivan Corona',
            email = 'ivan.corona@wasion.cn';
            
        RAISE NOTICE 'SUCCESS: Profile updated to Admin for ID %', target_user_id;
    ELSE
        RAISE NOTICE 'ERROR: User ivan.corona@wasion.cn NOT FOUND in Authentication. Please create the user first.';
    END IF;
END $$;

-- 3. Verify the result (Select specifically to show output)
SELECT * FROM public.profiles WHERE email = 'ivan.corona@wasion.cn';
