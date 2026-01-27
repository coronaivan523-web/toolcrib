-- Create 'messages' table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id), -- Nullable for system broadcasts
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'support', -- 'support', 'announcement', etc.
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Sender can view their own messages
CREATE POLICY "Users can view messages sent by them" ON public.messages
FOR SELECT TO authenticated USING (auth.uid() = sender_id);

-- 2. Sender can insert messages
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- 3. Recipient can view messages sent to them
CREATE POLICY "Users can view messages received" ON public.messages
FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

-- 4. Recipient can update (e.g., mark as read)
CREATE POLICY "Recipients can update their messages" ON public.messages
FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- Grant access
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
