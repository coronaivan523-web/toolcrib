-- Script para asignar una foto de perfil a un usuario
-- Ejecuta este script en el Editor SQL de Supabase para ver el cambio reflejado.

-- Reemplaza 'tu_email_aqui@ejemplo.com' con el correo de tu usuario
-- Puedes cambiar la URL por cualquier imagen pública que desees.

UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN '{"avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}'::jsonb
    ELSE raw_user_meta_data || '{"avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}'::jsonb
  END
WHERE email = 'admin@toolcrib.com'; -- <--- CAMBIA ESTE CORREO POR EL TUYO

-- Nota: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" es un generador de avatares gratuito.
-- Puedes poner la URL de cualquier imagen (png, jpg) que esté en internet.
