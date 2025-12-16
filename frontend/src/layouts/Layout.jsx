import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Ticket, LogOut, Menu, Box } from 'lucide-react'
import clsx from 'clsx'

export default function Layout() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
            if (!session) navigate('/login')
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (!session) navigate('/login')
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>

    if (!session) return null

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Material Master', href: '/inventory', icon: Package },
        { name: 'Inventory', href: '/stock', icon: Box }, // Using Box icon for Stock
        { name: 'Tickets', href: '/tickets', icon: Ticket },
    ]

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar */}
            <div
                className={clsx(
                    "bg-primary-900 text-white transition-all duration-300 flex flex-col border-r border-primary-800",
                    sidebarOpen ? "w-72" : "w-20"
                )}
            >
                <div className="flex flex-col border-b border-primary-800 bg-primary-900">
                    <div className="flex h-24 items-center justify-between px-5">
                        {sidebarOpen && <span className="text-3xl font-bold tracking-wider text-white">TOOLCRIB</span>}
                        {!sidebarOpen && <span className="text-2xl font-bold text-white hidden">TC</span>}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-primary-200 hover:text-white mx-auto">
                            <Menu size={28} />
                        </button>
                    </div>
                    {sidebarOpen && (
                        <div className="px-5 pb-6 flex items-center gap-4 overflow-hidden">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold text-lg ring-2 ring-primary-600 overflow-hidden">
                                {session.user.user_metadata?.avatar_url ? (
                                    <img
                                        src={session.user.user_metadata.avatar_url}
                                        alt="User Avatar"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    session.user.email[0].toUpperCase()
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-white break-words leading-tight">{session.user.email}</span>
                                <span className="text-xs text-primary-300 mt-0.5">Online</span>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 space-y-2 p-4">
                    {navigation.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    "flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors relative group",
                                    isActive
                                        ? "bg-primary-700 text-white shadow-sm"
                                        : "text-primary-200 hover:bg-primary-800 hover:text-white"
                                )}
                            >
                                <Icon size={24} />
                                {sidebarOpen ? (
                                    <span className="text-lg">{item.name}</span>
                                ) : (
                                    <div className="absolute left-full top-1/2 ml-4 -translate-y-1/2 px-2 py-1 bg-primary-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="border-t border-primary-800 p-4">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-primary-200 hover:bg-primary-800 hover:text-white relative group"
                    >
                        <LogOut size={24} />
                        {sidebarOpen ? (
                            <span className="text-lg">Logout</span>
                        ) : (
                            <div className="absolute left-full top-1/2 ml-4 -translate-y-1/2 px-2 py-1 bg-primary-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                Logout
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">

                <main className="flex-1 h-full flex flex-col">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
