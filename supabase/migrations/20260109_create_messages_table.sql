-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means broadcast? Or handle in app logic
    subject text NOT NULL,
    body text NOT NULL,
    type text NOT NULL CHECK (type IN ('announcement', 'support')),
    attachment_url text,
    is_read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view messages sent TO them
CREATE POLICY "Users can view received messages" 
ON public.messages FOR SELECT 
USING (auth.uid() = recipient_id);

-- 2. Users can view messages sent BY them
CREATE POLICY "Users can view sent messages" 
ON public.messages FOR SELECT 
USING (auth.uid() = sender_id);

-- 3. Users can insert messages (sending support tickets or admins sending announcements)
-- We'll allow any auth user to insert, logic will handle validity.
CREATE POLICY "Users can insert messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- 4. Users can update 'is_read' on received messages
CREATE POLICY "Recipients can update is_read" 
ON public.messages FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
