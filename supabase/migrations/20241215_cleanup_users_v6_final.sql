-- Migration: Universal User Cleanup and Reassignment v6 (Final)
-- Purpose: Safely delete users by reassigning their data
-- Fix: Covers archived_materials and ALL 'created_by' columns

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
    SELECT id INTO new_admin_id FROM auth.users WHERE email = new_admin_email;

    IF new_admin_id IS NULL THEN
        RAISE EXCEPTION 'Usuario principal % no encontrado!', new_admin_email;
    END IF;

    RAISE NOTICE 'Reasignando todo a ID: %', new_admin_id;

    FOREACH target_email IN ARRAY emails_to_delete
    LOOP
        SELECT id INTO target_id FROM auth.users WHERE email = target_email;

        IF target_id IS NOT NULL THEN
            RAISE NOTICE 'Procesando usuario: %', target_email;

            -- 1. MATERIALS (Registered, Deactivated, Requested, Created)
            UPDATE public.materials SET registered_by = new_admin_id WHERE registered_by::text = target_id::text;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'deactivated_by') THEN
                UPDATE public.materials SET deactivated_by = new_admin_id WHERE deactivated_by::text = target_id::text;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'requested_by') THEN
                UPDATE public.materials SET requested_by = new_admin_id::text WHERE requested_by::text = target_id::text;
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'created_by') THEN
                UPDATE public.materials SET created_by = new_admin_id::text WHERE created_by::text = target_id::text;
            END IF;

            -- 2. ARCHIVED MATERIALS (Created, Archived)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archived_materials') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archived_materials' AND column_name = 'created_by') THEN
                    UPDATE public.archived_materials SET created_by = new_admin_id WHERE created_by::text = target_id::text;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archived_materials' AND column_name = 'archived_by') THEN
                    UPDATE public.archived_materials SET archived_by = new_admin_id WHERE archived_by::text = target_id::text;
                END IF;
            END IF;

            -- 3. EVENTOS
            UPDATE public.material_events SET performed_by = new_admin_id WHERE performed_by::text = target_id::text;

            -- 4. TICKETS
            UPDATE public.tickets SET requester_id = new_admin_id WHERE requester_id::text = target_id::text;
            UPDATE public.tickets SET assigned_to = new_admin_id WHERE assigned_to::text = target_id::text;

            -- 5. INVENTORY MOVEMENTS 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
                 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'user_id') THEN
                     UPDATE public.inventory_movements SET user_id = new_admin_id WHERE user_id::text = target_id::text;
                 END IF;
                 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'created_by') THEN
                     UPDATE public.inventory_movements SET created_by = new_admin_id WHERE created_by::text = target_id::text;
                 END IF;
            END IF;

            -- 6. AUDIT LOGS 
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'performed_by') THEN
                    UPDATE public.audit_logs SET performed_by = new_admin_id WHERE performed_by::text = target_id::text;
                 END IF;
            END IF;

            -- 7. BORRADO FINAL
            DELETE FROM public.profiles WHERE id = target_id;
            DELETE FROM auth.users WHERE id = target_id;

            RAISE NOTICE '¡EXITO! Usuario eliminado: %', target_email;
        ELSE
            RAISE NOTICE 'Usuario % no encontrado.', target_email;
        END IF;
    END LOOP;
END $$;
