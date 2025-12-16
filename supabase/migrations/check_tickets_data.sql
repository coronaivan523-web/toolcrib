-- Check tickets data
SELECT 
    id, 
    requester_id, 
    status, 
    created_at, 
    folio 
FROM public.tickets 
ORDER BY created_at DESC;
