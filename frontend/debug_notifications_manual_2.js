
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bykumuizmxsclsazeych.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
    console.log("--- DEBUGGING NOTIFICATIONS (WITHOUT HINT) ---");

    // Test Query removing the hint
    const { data: qData, error: qError } = await supabase
        .from('notifications')
        .select('*, sender:profiles(full_name, email), material:materials(name, part_number)')
        .eq('type', 'low_stock_alert')
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

    if (qError) {
        console.error("Query Error:", qError);
    } else {
        console.log("Query Results:", qData.length);
        console.log("First item:", JSON.stringify(qData[0], null, 2));
    }
}

run();
