ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.messages(id);

-- Validar que no nos auto-referenciemos (opcional, pero buena práctica)
-- (Supabase/Postgres no tiene constraint simple para esto sin triggers, así que lo dejamos simple por ahora)
