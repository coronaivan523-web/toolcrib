
const { createClient } = require('@supabase/supabase-js')

// Hardcoded for debugging - extracted from existing .env if possible, or just known strings
const supabaseUrl = 'https://bykumuizmxsclsazeych.supabase.co'
// Using the service key or anon key depending on what we want to test.
// We want to test USER LOGIN so we use ANON key and then sign in.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODU4NDQsImV4cCI6MjA4MDk2MTg0NH0.R2h9i6n7eL4aX_k2yJ2yV-X8e_5Z4qS-X3j_1a-X2h' // Placeholder or extracting from previous steps

async function testSupervisorPermissions() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    console.log("Logging in as supervisor...")
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'supervisor.test@wasion.cn',
        password: 'password123'
    })

    if (loginError) {
        console.error("Login failed:", loginError)
        return
    }

    console.log("Login successful. User ID:", user.id)

    // finding a material
    const { data: materials } = await supabase.from('materials').select('id, current_stock').limit(1).single()
    if (!materials) {
        console.error("No materials found")
        return
    }

    console.log("Attempting to update material:", materials.id)
    const { error: updateError } = await supabase
        .from('materials')
        .update({ current_stock: materials.current_stock }) // No change, just testing permission
        .eq('id', materials.id)

    if (updateError) {
        console.error("Update FAILED (RLS likely):", updateError)
        console.log("Error details:", JSON.stringify(updateError, null, 2))
    } else {
        console.log("Update SUCCESSFUL")
    }
}

testSupervisorPermissions()
