import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bykumuizmxsclsazeych.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODU4NDQsImV4cCI6MjA4MDk2MTg0NH0.DfozRzeTRiReELAZ7GMHjJosHkrPCEixmWS8BMSUFso'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testQuery() {
    console.log("Running query...")
    const { data, error } = await supabase
        .from('cycle_count_lines')
        .select('*, material:materials(name), session:cycle_count_sessions(assigned_to, planned_date)')
        // .is('qty_physical', null)
        .order('count_date', { ascending: false })
        .limit(5)

    if (error) {
        console.error("Query Error:", error)
    } else {
        console.log("Found lines:", data.length)
        if (data.length > 0) {
            console.log("Sample Line Session Data:", JSON.stringify(data[0].session, null, 2))
            console.log("Sample Line Full:", JSON.stringify(data[0], null, 2))
        } else {
            console.log("No active lines found.")
        }
    }
}

testQuery()
