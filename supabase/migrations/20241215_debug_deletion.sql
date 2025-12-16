-- Debug Script: Identify Blocking Foreign Key
-- Run this to find out EXACTLY which table is stopping the deletion
DO $$
DECLARE
    target_email text := 'admin@toolcrib.com'; -- Change if needed
    target_id uuid;
BEGIN
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;
    
    IF target_id IS NOT NULL THEN
        RAISE NOTICE 'Attempting to delete user % (ID: %)', target_email, target_id;
        
        BEGIN
            DELETE FROM auth.users WHERE id = target_id;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE '---------------------------------------------------';
            RAISE NOTICE '❌ DELETION BLOCKED BY FOREIGN KEY!';
            RAISE NOTICE 'Error Message: %', SQLERRM;
            RAISE NOTICE 'Constraint Name: %', PG_CONSTRAINT_NAME;
            RAISE NOTICE 'Table Name (approx): %', PG_TABLE_NAME;
            RAISE NOTICE 'Detail: %', PG_EXCEPTION_DETAIL;
            RAISE NOTICE '---------------------------------------------------';
            RAISE NOTICE 'Please copy the messages above and share them with the support agent.';
        END;
    ELSE
        RAISE NOTICE 'User not found.';
    END IF;
END $$;
