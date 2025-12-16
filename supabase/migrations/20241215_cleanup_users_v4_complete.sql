-- Migration: Universal User Cleanup and Reassignment v4 (Complete)
-- Purpose: Safely delete users by reassigning their data to the main admin first
-- Handles: materials, material_events, tickets, inventory_movements, profiles, auth.users
-- Fix: Includes inventory_movements handling and type casting

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

            -- A. Reassign Materials
            UPDATE public.materials 
            SET registered_by = new_admin_id 
            WHERE registered_by::text = target_id::text;

            -- B. Reassign Material Events
            UPDATE public.material_events 
            SET performed_by = new_admin_id 
            WHERE performed_by::text = target_id::text;

            -- C. Reassign Tickets (Requester & Assignee)
            UPDATE public.tickets 
            SET requester_id = new_admin_id 
            WHERE requester_id::text = target_id::text;

            UPDATE public.tickets 
            SET assigned_to = new_admin_id 
            WHERE assigned_to::text = target_id::text;

            -- D. Reassign Inventory Movements (Fix for 23503 error)
            -- Assuming column is user_id based on constraint inventory_movements_user_id_fkey
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
                 UPDATE public.inventory_movements
                 SET user_id = new_admin_id
                 WHERE user_id::text = target_id::text;
            END IF;

            -- E. Delete from profiles
            DELETE FROM public.profiles WHERE id = target_id;

            -- F. Delete from auth.users
            DELETE FROM auth.users WHERE id = target_id;

            RAISE NOTICE 'Successfully deleted user: %', target_email;
        ELSE
            RAISE NOTICE 'User % not found, skipping.', target_email;
        END IF;
    END LOOP;

END $$;
