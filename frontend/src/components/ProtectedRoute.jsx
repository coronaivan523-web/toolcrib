import { Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children, allowedRoles }) {
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

    // If user role is not in allowed roles, redirect to tickets
    if (userRole && !allowedRoles.includes(userRole)) {
        return <Navigate to="/tickets" replace />
    }

    return children
}
