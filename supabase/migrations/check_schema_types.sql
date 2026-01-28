-- Diagnostic Script to check column types
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'ticket_items' AND column_name = 'id';

    RAISE EXCEPTION 'Diagnostic Info: ticket_items.id type is %', col_type;
END $$;
