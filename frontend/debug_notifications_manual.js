
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bykumuizmxsclsazeych.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
    console.log("--- DEBUGGING NOTIFICATIONS ---");

    // 1. Count all
    const { count, error: countError } = await supabase.from('notifications').select('*', { count: 'exact', head: true });
    console.log("Total Notifications:", count, countError ? countError : "");

    // 2. Select raw (limit 5)
    const { data: raw, error: rawError } = await supabase.from('notifications').select('*').limit(5);
    console.log("Raw Notifications (first 5):", JSON.stringify(raw, null, 2));

    // 3. Test Query used in Tickets.jsx
    console.log("\n--- TESTING APP QUERY ---");
    const { data: qData, error: qError } = await supabase
        .from('notifications')
        .select('*, sender:profiles!notifications_sender_id_fkey(full_name, email), material:materials(name, part_number)')
        .eq('type', 'low_stock_alert')
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

    if (qError) {
        console.error("Query Error:", qError);
    } else {
        console.log("Query Results:", qData.length);
        console.log(JSON.stringify(qData, null, 2));
    }
}

run();
