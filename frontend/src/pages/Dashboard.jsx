import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

export default function Dashboard() {
    const [currentUser, setCurrentUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        if (user) {
            console.log("Dashboard: Fetching profile for", user.id)

            // Try standard RLS fetch first
            let { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            // If that fails (RLS block), try the secure RPC
            if (error || !profile) {
                console.warn("Standard fetch failed, trying secure RPC...", error)
                const { data: rpcProfile, error: rpcError } = await supabase
                    .rpc('get_my_profile')
                    .single()

                if (rpcError) {
                    console.error("RPC fetch also failed:", rpcError)
                } else if (rpcProfile) {
                    console.log("Profile fetched via RPC:", rpcProfile)
                    profile = rpcProfile
                }
            }

            if (profile) {
                setUserProfile(profile)
            } else {
                console.error("Could not fetch profile via any method.")
            }
        }
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <PageHeader
                title="Dashboard"
                subtitle="Overview and Metrics"
                user={currentUser}
                profile={userProfile}
                bgColor="#1f2937" // Gray-800: Soft dark grey
            />

            {/* Content */}
            <div className="flex-1 p-8 flex items-center justify-center text-slate-400">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Welcome to ToolCrib</h2>
                    <p>Select a module from the sidebar to get started.</p>
                </div>
            </div>
        </div>
    )
}
