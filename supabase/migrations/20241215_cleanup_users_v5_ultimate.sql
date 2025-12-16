-- Migration: Universal User Cleanup and Reassignment v5 (Ultimate)
-- Purpose: Safely delete users by reassigning their data to the main admin first
-- Handles: materials (registered_by, deactivated_by, requested_by), material_events, tickets, inventory_movements, audit_logs
-- Fix: Covers all discovered foreign key constraints and uses dynamic checks

DO $$
DECLARE
    -- The main admin who will inherit all data
    new_admin_email text := 'ivan.corona@wasion.cn';
    new_admin_id uuid;
    
    -- List of emails to delete
    emails_to_delete text[] := ARRAY[
        'admin@toolcrib.com',
        'test_qa_auto@example.com'
    ];
    
    target_email text;
    target_id uuid;
BEGIN
    -- 1. Get the ID of the new owner (heir)
    SELECT id INTO new_admin_id FROM auth.users WHERE email = new_admin_email;

    IF new_admin_id IS NULL THEN
        RAISE EXCEPTION 'Main admin user % not found!', new_admin_email;
    END IF;

    RAISE NOTICE 'Reassigning data to Admin ID: %', new_admin_id;

    -- 2. Iterate through each user to delete
    FOREACH target_email IN ARRAY emails_to_delete
    LOOP
        -- Get ID of user to delete
        SELECT id INTO target_id FROM auth.users WHERE email = target_email;

        IF target_id IS NOT NULL THEN
            RAISE NOTICE 'Processing cleanup for user: % (ID: %)', target_email, target_id;

            -- A. MATERIALS table
            -- registered_by
            UPDATE public.materials 
            SET registered_by = new_admin_id 
            WHERE registered_by::text = target_id::text;
            
            -- deactivated_by (NEW discovery)
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'deactivated_by') THEN
                UPDATE public.materials 
                SET deactivated_by = new_admin_id 
                WHERE deactivated_by::text = target_id::text;
            END IF;

            -- requested_by (might be text or uuid, safe to update if uuid match as text)
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'requested_by') THEN
                UPDATE public.materials 
                SET requested_by = new_admin_id::text
                WHERE requested_by = target_id::text; 
            END IF;

            -- B. MATERIAL_EVENTS table
            -- performed_by
            UPDATE public.material_events 
            SET performed_by = new_admin_id 
            WHERE performed_by::text = target_id::text;

            -- C. TICKETS table
            -- requester_id & assigned_to
            UPDATE public.tickets 
            SET requester_id = new_admin_id 
            WHERE requester_id::text = target_id::text;

            UPDATE public.tickets 
            SET assigned_to = new_admin_id 
            WHERE assigned_to::text = target_id::text;

            -- D. INVENTORY_MOVEMENTS table (User reported error here)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
                 -- Check common column names for user reference
                 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'user_id') THEN
                     UPDATE public.inventory_movements
                     SET user_id = new_admin_id
                     WHERE user_id::text = target_id::text;
                 END IF;
                 
                 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'created_by') THEN
                     UPDATE public.inventory_movements
                     SET created_by = new_admin_id
                     WHERE created_by::text = target_id::text;
                 END IF;
            END IF;

            -- E. AUDIT_LOGS table (Discovered in grep)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'performed_by') THEN
                    UPDATE public.audit_logs
                    SET performed_by = new_admin_id
                    WHERE performed_by::text = target_id::text;
                 END IF;
            END IF;

            -- F. Delete from profiles
            DELETE FROM public.profiles WHERE id = target_id;

            -- G. Delete from auth.users
            DELETE FROM auth.users WHERE id = target_id;

            RAISE NOTICE 'Successfully deleted user: %', target_email;
        ELSE
            RAISE NOTICE 'User % not found, skipping.', target_email;
        END IF;
    END LOOP;

END $$;
