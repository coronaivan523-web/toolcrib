-- ==============================================================================
-- P0 IDENTITY DECOUPLE
-- Elimina restricciones físicas hacia auth.users y redirecciona a public.profiles
-- Conserva el RLS intacto con auth.uid() para JWT. Habilita clonación public-only.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
    drop_stmt TEXT;
BEGIN
    -- 1. DROPEAR TODAS LAS FOREIGN KEYS QUE APUNTAN A auth.users DESDE public
    FOR r IN
        SELECT
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
    LOOP
        drop_stmt := format('ALTER TABLE %I.%I DROP CONSTRAINT %I;', r.table_schema, r.table_name, r.constraint_name);
        RAISE NOTICE 'Executing: %', drop_stmt;
        EXECUTE drop_stmt;
    END LOOP;
END $$;

-- 2. RE-VINCULAR HACIA public.profiles COMO BASE DE IDENTIDAD LOCAL
-- Usamos DO blocks o sentencias crudas. Agregamos las FKs a profiles.
-- Se hace caso por caso asumiendo nombres por defecto si no existen, o para asegurarnos que se añaden.

DO $$
BEGIN
    -- profiles (no tiene padre ahora, se vuelve la tabla ancla)
    
    -- materials
    BEGIN ALTER TABLE public.materials ADD CONSTRAINT materials_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.materials ADD CONSTRAINT materials_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.materials ADD CONSTRAINT materials_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;

    -- material_events
    BEGIN ALTER TABLE public.material_events ADD CONSTRAINT material_events_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.material_events ADD CONSTRAINT material_events_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;

    -- tickets
    BEGIN ALTER TABLE public.tickets ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.tickets ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;

    -- requisitions
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_gerente_mx_id_fkey FOREIGN KEY (gerente_mx_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_gerente_ch_id_fkey FOREIGN KEY (gerente_ch_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_gerente_gral_id_fkey FOREIGN KEY (gerente_gral_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_action_by_user_id_fkey FOREIGN KEY (action_by_user_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;

    -- inventory_ledger_v2
    BEGIN ALTER TABLE public.inventory_ledger_v2 ADD CONSTRAINT inventory_ledger_v2_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;

    -- inventory_movements
    BEGIN ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN END;

    -- messages (si existe, puede fallar silenciosamente si no está instalada la tabla)
    BEGIN ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id); EXCEPTION WHEN undefined_table THEN END; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id); EXCEPTION WHEN undefined_table THEN END; EXCEPTION WHEN duplicate_object THEN END;

    -- notifications
    BEGIN ALTER TABLE public.notifications ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id); EXCEPTION WHEN undefined_table THEN END; EXCEPTION WHEN duplicate_object THEN END;

    -- cycle_count_lines
    BEGIN ALTER TABLE public.cycle_count_lines ADD CONSTRAINT cycle_count_lines_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.profiles(id); EXCEPTION WHEN undefined_table THEN END; EXCEPTION WHEN duplicate_object THEN END;

END $$;
