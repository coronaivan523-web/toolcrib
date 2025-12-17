import { Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RoleBasedHome() {
    const [userRole, setUserRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()

                setUserRole(profile?.role)
            }

            setLoading(false)
        }

        fetchUserRole()
    }, [])

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>
    }

    // Redirect based on user role
    if (userRole === 'user') {
        return <Navigate to="/tickets" replace />
    }

    // Admin, supervisor, and toolroom_staff go to dashboard
    return <Navigate to="/dashboard" replace />
}
