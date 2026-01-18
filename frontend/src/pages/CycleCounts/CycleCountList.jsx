import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cycleCounts } from '../../services/cycleCounts'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Calendar, CheckCircle, Clock, AlertCircle, User, ClipboardList as ClipboardListIcon } from 'lucide-react'
import clsx from 'clsx'

export default function CycleCountList() {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filter, setFilter] = useState('ALL') // ALL, DRAFT, SUBMITTED, HISTORY
    const navigate = useNavigate()

    // Header State
    const [userRole, setUserRole] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)

    useEffect(() => {
        loadSessions()
        fetchUserRole()
    }, [filter])

    const fetchUserRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setCurrentUser(user)
            if (user) {
                let { data, error } = await supabase
                    .from('profiles')
                    .select('role, full_name, avatar_url')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setUserRole(data.role)
                    setUserProfile(data)
                }
            }
        } catch (error) {
            console.error("Error fetching user role:", error)
        }
    }

    const loadSessions = async () => {
        setLoading(true)
        try {
            const status = filter === 'ALL' ? null : (filter === 'HISTORY' ? 'HISTORY' : filter)
            const data = await cycleCounts.getSessions(status)
            setSessions(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        try {
            // Default new session for today
            const today = new Date().toISOString().split('T')[0]
            const newSession = await cycleCounts.createSession({
                count_date: today,
                notes: 'New Cycle Count',
                location_scope: 'All'
            })
            navigate(`/cycle-counts/${newSession.id}`)
        } catch (err) {
            alert('Error creating session: ' + err.message)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800'
            case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
            case 'APPROVED': return 'bg-green-100 text-green-800'
            case 'REJECTED': return 'bg-red-100 text-red-800'
            case 'CANCELLED': return 'bg-yellow-100 text-yellow-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Unified Header */}
            <div className="bg-slate-900 shadow-md z-30 shrink-0" style={{ backgroundColor: '#0f172a' }}>
                <div className="relative px-8 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Logo Section */}
                    <div className="w-80 flex flex-col items-center">
                        <img src="/wasion_logo_large.png" alt="Wasion Logo" className="w-full object-contain" />
                        <div className="text-white text-[10px] font-bold tracking-[0.8em] uppercase opacity-90 mt-0 text-center w-full leading-none">
                            Made in Mexico
                        </div>
                    </div>

                    {/* User Profile Section */}
                    {(userProfile || currentUser) && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4 bg-primary-800/40 rounded-full pr-6 pl-2 py-1.5 border border-primary-700/50 shadow-sm">
                            <div className="h-12 w-12 rounded-full ring-2 ring-white/20 overflow-hidden bg-primary-700 flex items-center justify-center shrink-0">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-7 w-7 text-primary-300" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm tracking-wide leading-tight">
                                    {userProfile?.full_name || currentUser?.email?.split('@')[0] || 'User'}
                                </span>
                                <span className="text-primary-300 text-[10px] font-medium uppercase tracking-wider">
                                    {userRole || 'User'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Page Title Section */}
                    <div className="text-center">
                        <h1 className="text-2xl font-extrabold text-white tracking-widest leading-tight uppercase">
                            CYCLE COUNTS
                        </h1>
                        <p className="text-primary-200 mt-0 text-sm font-medium tracking-wide">Manage inventory verification sessions</p>
                    </div>
                </div>

                {/* Toolbar inside Header */}
                <div className="px-6 pb-0 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 border-t border-white/5 text-white backdrop-blur-sm">
                    <div className="relative max-w-xs w-full mt-2 mb-2">
                        {/* Search could go here if implemented properly later */}
                    </div>
                    <div className="flex items-center gap-2 mt-2 mb-2">
                        <div className="bg-white/10 text-white px-3 py-1.5 rounded-md text-xs font-medium border border-white/10 shadow-sm">
                            Total: <span className="font-bold ml-1 text-primary-200">{sessions.length}</span>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center justify-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-500 transition-all text-xs font-bold shadow-lg transform hover:-translate-y-0.5 border border-primary-400"
                        >
                            <Plus size={14} strokeWidth={3} />
                            New Session
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-7xl mx-auto w-full overflow-y-auto">

                {/* Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {[
                        { label: 'All', value: 'ALL' },
                        { label: 'Drafts', value: 'DRAFT' },
                        { label: 'Submitted', value: 'SUBMITTED' },
                        { label: 'History', value: 'HISTORY' }
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilter(opt.value)}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                                filter === opt.value
                                    ? "bg-primary-100 text-primary-800 border-primary-200 border"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                        Error: {error}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                            <ClipboardListIcon className="w-full h-full" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No sessions found</h3>
                        <p className="text-gray-500 mt-1">Get started by creating a new cycle count session.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sessions.map((session) => (
                                    <tr
                                        key={session.id}
                                        onClick={() => navigate(`/cycle-counts/${session.id}`)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900 font-medium">
                                                <Calendar size={16} className="mr-2 text-gray-400" />
                                                {session.count_date}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 ml-6">
                                                {new Date(session.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{session.created_by_name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{session.location_scope || '-'}</div>
                                            {session.notes && (
                                                <div className="text-xs text-gray-400 truncate max-w-[150px]">{session.notes}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx(
                                                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                getStatusColor(session.status)
                                            )}>
                                                {session.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                                            {session.id.slice(0, 8)}...
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

