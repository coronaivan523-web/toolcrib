/* Script para crear usuarios de prueba en Supabase */
/* IMPORTANTE: Primero debes crear los usuarios en Authentication > Users */

/* 1. Usuario Normal - user.test@wasion.cn */
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'user.test@wasion.cn';

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'user.test@wasion.cn'),
    'user.test@wasion.cn',
    'Test User',
    'user'
)
ON CONFLICT (id) 
DO UPDATE SET 
    full_name = 'Test User',
    role = 'user';

/* 2. Personal del Tool Room - toolroom.test@wasion.cn */
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'toolroom.test@wasion.cn';

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'toolroom.test@wasion.cn'),
    'toolroom.test@wasion.cn',
    'Tool Room Test',
    'admin'
)
ON CONFLICT (id) 
DO UPDATE SET 
    full_name = 'Tool Room Test',
    role = 'admin';

/* 3. Supervisor - supervisor.test@wasion.cn */
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'supervisor.test@wasion.cn';

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'supervisor.test@wasion.cn'),
    'supervisor.test@wasion.cn',
    'Supervisor Test',
    'supervisor'
)
ON CONFLICT (id) 
DO UPDATE SET 
    full_name = 'Supervisor Test',
    role = 'supervisor';

/* Verificar usuarios creados */
SELECT 
    p.email,
    p.full_name,
    p.role
FROM public.profiles p
WHERE p.email IN ('user.test@wasion.cn', 'toolroom.test@wasion.cn', 'supervisor.test@wasion.cn')
ORDER BY p.role;
