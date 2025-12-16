-- Migration: Universal User Cleanup and Reassignment
-- Purpose: Safely delete users by reassigning their data to the main admin first
-- Handles: materials, material_events, tickets, profiles, auth.users

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

            -- A. Reassign Materials (registered_by)
            UPDATE public.materials
            SET registered_by = new_admin_id
            WHERE registered_by = target_id;

            -- B. Reassign Material Events (performed_by)
            UPDATE public.material_events
            SET performed_by = new_admin_id
            WHERE performed_by = target_id;

            -- C. Reassign Tickets (requester_id and assigned_to)
            -- If the user requested a ticket, change requester to new admin
            UPDATE public.tickets
            SET requester_id = new_admin_id
            WHERE requester_id = target_id;

            -- If the user was assigned a ticket (as admin), change assignee to new admin
            UPDATE public.tickets
            SET assigned_to = new_admin_id
            WHERE assigned_to = target_id;

            -- D. Delete from profiles
            DELETE FROM public.profiles WHERE id = target_id;

            -- E. Delete from auth.users
            DELETE FROM auth.users WHERE id = target_id;

            RAISE NOTICE 'Successfully deleted user: %', target_email;
        ELSE
            RAISE NOTICE 'User % not found, skipping.', target_email;
        END IF;
    END LOOP;

END $$;
