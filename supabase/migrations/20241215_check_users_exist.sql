-- Verify if legacy users still exist
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN ('admin@toolcrib.com', 'test_qa_auto@example.com');
