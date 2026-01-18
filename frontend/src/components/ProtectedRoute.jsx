import { Navigate, useOutletContext } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRoles }) {
    const context = useOutletContext()
    const userProfile = context?.userProfile

    // If we are active, Layout has already loaded.
    // If no profile, we can't verify role. But Layout handles auth redirect.
    // If userProfile is missing but we are here, something is odd, but let's assume valid for now or default to safe.

    if (!userProfile) {
        // Technically this shouldn't happen inside Layout if session is valid.
        // But if it does, allowing render might expose content? 
        // Better to redirect or return null.
        return null
    }

    const { role } = userProfile

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/tickets" replace />
    }

    return children
}
