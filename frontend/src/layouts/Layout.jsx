import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Ticket, LogOut, Menu, Box, ClipboardList } from 'lucide-react'
import clsx from 'clsx'

export default function Layout() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [userProfile, setUserProfile] = useState(null)
    const [adminViewMode, setAdminViewMode] = useState('admin') // 'admin', 'toolroom', 'user'
    const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)

            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                setUserProfile(profile)
            }

            setLoading(false)
            if (!session) navigate('/login')
        }

        fetchUserProfile()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (!session) navigate('/login')
            else fetchUserProfile()
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    // Redirect if current page is not accessible in the new view mode
    useEffect(() => {
        if (!userProfile) return

        const allNavigation = [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'toolroom_staff'] },
            { name: 'Material Master', href: '/inventory', icon: Package, roles: ['admin', 'supervisor', 'toolroom_staff'] },
            { name: 'Inventory', href: '/stock', icon: Box, roles: ['admin', 'supervisor', 'toolroom_staff'] },
            { name: 'Requisitions', href: '/requisitions', icon: ClipboardList, roles: ['admin', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician'] },
            { name: 'Tickets', href: '/tickets', icon: Ticket, roles: ['admin', 'supervisor', 'toolroom_staff', 'user'] },
        ]

        const effectiveRole = userProfile?.role === 'admin' && adminViewMode !== 'admin'
            ? adminViewMode === 'toolroom' ? 'toolroom_staff' : 'user'
            : userProfile?.role

        const currentPage = allNavigation.find(item => item.href === location.pathname)

        // If current page is not accessible in the new role, redirect to tickets
        if (currentPage && !currentPage.roles.includes(effectiveRole)) {
            navigate('/tickets')
        }
    }, [adminViewMode, userProfile, location.pathname, navigate])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>

    if (!session) return null

    const allNavigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'toolroom_staff'] },
        { name: 'Material Master', href: '/inventory', icon: Package, roles: ['admin', 'supervisor', 'toolroom_staff'] },
        { name: 'Inventory', href: '/stock', icon: Box, roles: ['admin', 'supervisor', 'toolroom_staff'] },
        { name: 'Requisitions', href: '/requisitions', icon: ClipboardList, roles: ['admin', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician'] },
        { name: 'Tickets', href: '/tickets', icon: Ticket, roles: ['admin', 'supervisor', 'toolroom_staff', 'user'] },
    ]

    // Determine effective role based on admin view mode
    const effectiveRole = userProfile?.role === 'admin' && adminViewMode !== 'admin'
        ? adminViewMode === 'toolroom' ? 'toolroom_staff' : 'user'
        : userProfile?.role

    // Filter navigation based on effective role
    const navigation = allNavigation.filter(item =>
        !userProfile || item.roles.includes(effectiveRole)
    )

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
                        <div className="px-5 pb-4 border-b border-primary-800">
                            <div className="flex items-center gap-4 mb-3">
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
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-medium text-white break-words leading-tight">{session.user.email}</span>
                                    <span className="text-xs text-primary-300 mt-0.5">Online</span>
                                </div>
                            </div>
                            {/* Admin View Selector Dropdown */}
                            {userProfile?.role === 'admin' && (
                                <div className="relative">
                                    <button
                                        onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                                        className="w-full bg-primary-800 hover:bg-primary-700 text-white px-3 py-2 rounded-lg flex items-center justify-between transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                                {adminViewMode === 'admin' ? '👑' : adminViewMode === 'toolroom' ? '🔧' : '👤'}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {adminViewMode === 'admin' ? 'Admin View' : adminViewMode === 'toolroom' ? 'Toolroom View' : 'User View'}
                                            </span>
                                        </div>
                                        <svg className={`w-4 h-4 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {/* Dropdown Menu */}
                                    {viewDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-primary-800 rounded-lg shadow-xl border border-primary-700 overflow-hidden z-50">
                                            <button
                                                onClick={() => {
                                                    setAdminViewMode('admin')
                                                    setViewDropdownOpen(false)
                                                }}
                                                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-primary-700 transition-colors ${adminViewMode === 'admin' ? 'bg-primary-700' : ''}`}
                                            >
                                                <span className="text-lg">👑</span>
                                                <span className="text-sm text-white">Admin View</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAdminViewMode('toolroom')
                                                    setViewDropdownOpen(false)
                                                }}
                                                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-primary-700 transition-colors ${adminViewMode === 'toolroom' ? 'bg-primary-700' : ''}`}
                                            >
                                                <span className="text-lg">🔧</span>
                                                <span className="text-sm text-white">Toolroom Staff View</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAdminViewMode('user')
                                                    setViewDropdownOpen(false)
                                                }}
                                                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-primary-700 transition-colors ${adminViewMode === 'user' ? 'bg-primary-700' : ''}`}
                                            >
                                                <span className="text-lg">👤</span>
                                                <span className="text-sm text-white">Regular User View</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                    <Outlet context={{ userProfile, adminViewMode }} />
                </main>
            </div>
        </div>
    )
}
