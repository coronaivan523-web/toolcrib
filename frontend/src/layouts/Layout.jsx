import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Ticket, LogOut, Menu, Box, ClipboardList, User, Recycle } from 'lucide-react'
import clsx from 'clsx'

const ALL_NAVIGATION = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'staff_level_1'] },
    { name: 'Material Master', href: '/inventory', icon: Package, roles: ['admin', 'supervisor', 'toolroom_staff'] },
    { name: 'Inventory', href: '/stock', icon: Box, roles: ['admin', 'supervisor', 'toolroom_staff'] },
    { name: 'Cycle Counts', href: '/cycle-counts', icon: Recycle, roles: ['admin', 'supervisor', 'toolroom_staff'] },
    { name: 'Requisitions', href: '/requisitions', icon: ClipboardList, roles: ['admin', 'supervisor', 'toolroom_staff', 'staff_level_1', 'staff_level_2'] },
    { name: 'Tickets', href: '/tickets', icon: Ticket, roles: ['admin', 'supervisor', 'toolroom_staff', 'user', 'staff_level_1', 'staff_level_2'] },
    { name: 'Users', href: '/users', icon: User, roles: ['admin'] },
]

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

    // Normalize Role helper
    const getEffectiveRole = () => {
        if (!userProfile?.role) return null

        let role = userProfile.role
        if (role === 'admin' && adminViewMode !== 'admin') {
            role = adminViewMode === 'toolroom' ? 'toolroom_staff' : 'user'
        }

        // Consolidate Roles
        role = role.trim().toLowerCase()
        if (role === 'supervisor_tool') return 'supervisor'
        if (role === 'toolroom_technician') return 'toolroom_staff'

        // Ensure STAFF_LEVEL roles are lowercase and recognized
        if (role === 'staff_level_1') return 'staff_level_1'
        if (role === 'staff_level_2') return 'staff_level_2'

        return role
    }

    const effectiveRole = getEffectiveRole()

    // Redirect if current page is not accessible in the new view mode
    useEffect(() => {
        if (!effectiveRole) return

        const currentPage = ALL_NAVIGATION.find(item => item.href === location.pathname)

        console.log('[Layout] Navigation Check:', {
            path: location.pathname,
            role: effectiveRole,
            pageFound: currentPage?.name,
            allowedRoles: currentPage?.roles,
            isAllowed: currentPage ? currentPage.roles.includes(effectiveRole) : 'N/A'
        })

        // If current page is not accessible in the new role, redirect to tickets
        if (currentPage && !currentPage.roles.includes(effectiveRole)) {
            console.warn('[Layout] Redirecting to tickets. Reason: Role mismatch.')
            navigate('/tickets')
        }
    }, [effectiveRole, location.pathname, navigate])

    const handleLogout = async (e) => {
        if (e) e.preventDefault()
        try {
            console.log("Logging out...")
            const { error } = await supabase.auth.signOut()
            if (error) console.error("Error signing out:", error)
        } catch (err) {
            console.error("Unexpected error during logout:", err)
        } finally {
            // Force navigation to login regardless of auth state
            console.log("Navigating to login")
            navigate('/login')
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>

    if (!session) return null

    // Filter navigation based on effective role
    const navigation = ALL_NAVIGATION.filter(item => {
        if (item.name === 'Users') {
            const email = session?.user?.email;
            return email === 'ivan.corona@wasion.cn' || email === 'ivan.corona@wasion.com';
        }
        return !effectiveRole || item.roles.includes(effectiveRole)
    })



    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar */}
            <div
                className={clsx(
                    "bg-primary-900 text-white transition-all duration-300 flex flex-col border-r border-primary-800 min-h-screen",
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
                            <Link to="/profile" className="flex flex-col items-center gap-4 mb-6 mt-4 p-2 rounded-xl hover:bg-primary-800 transition-all group">
                                <div className="flex-shrink-0 h-44 w-44 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold text-5xl ring-4 ring-primary-600 overflow-hidden group-hover:ring-primary-500 shadow-2xl transition-all">
                                    {userProfile?.avatar_url ? (
                                        <img
                                            src={userProfile.avatar_url}
                                            alt="User Avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        session.user.email[0].toUpperCase()
                                    )}
                                </div>
                                <div className="flex flex-col items-center text-center w-full min-w-0 px-1">
                                    <span className="text-sm font-bold text-white break-words w-full leading-tight group-hover:text-primary-100 transition-colors">{session.user.email}</span>
                                    <span className="text-xs text-primary-400 mt-1.5 group-hover:text-primary-300 font-medium tracking-wide">EDIT PROFILE</span>
                                </div>
                            </Link>
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
                <main className="flex-1 h-full flex flex-col overflow-auto">
                    <Outlet context={{ userProfile, adminViewMode }} />
                </main>
            </div>
        </div>
    )
}
