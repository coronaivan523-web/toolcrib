/* Script para crear el rol toolroom_staff y actualizar usuarios */

/* 1. Actualizar el usuario toolroom.test a toolroom_staff */
UPDATE public.profiles 
SET role = 'toolroom_staff', full_name = 'Tool Room Staff Test'
WHERE email = 'toolroom.test@wasion.cn';

/* 2. Verificar la estructura de roles */
SELECT 
    email,
    full_name,
    role,
    CASE role
        WHEN 'admin' THEN 'Full access - Only Ivan Corona'
        WHEN 'supervisor' THEN 'Full access - Tool Room Supervisor'
        WHEN 'toolroom_staff' THEN 'Limited access - Tool Room Staff (cannot create/modify/delete materials)'
        WHEN 'user' THEN 'Tickets only - Normal user'
        ELSE 'Unknown role'
    END as permissions
FROM public.profiles 
WHERE email IN ('ivan.corona@wasion.cn', 'toolroom.test@wasion.cn', 'supervisor.test@wasion.cn', 'user.test@wasion.cn')
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1 
        WHEN 'supervisor' THEN 2 
        WHEN 'toolroom_staff' THEN 3
        WHEN 'user' THEN 4 
    END;
