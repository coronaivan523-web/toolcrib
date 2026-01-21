
import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, User, ArrowRight, RotateCw, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { cycleCountService } from '../../services/cycleCounts'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'

export default function CycleCountsIndex() {
    // Obtener adminViewMode del contexto para permitir simulación de vistas
    const { userProfile, adminViewMode } = useOutletContext() || {}
    const toast = useToast()
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const navigate = useNavigate()

    // Determinar rol efectivo (respetando simulación de admin)
    // Esto afecta tanto a la visibilidad de datos como a los permisos de UI
    let effectiveRole = userProfile?.role?.trim().toLowerCase()
    if (effectiveRole === 'admin' && adminViewMode === 'toolroom') {
        effectiveRole = 'toolroom_staff'
    }

    useEffect(() => {
        loadSessions()
    }, [effectiveRole]) // Recargar si cambia el rol efectivo (por adminViewMode o cambio de user)

    const loadSessions = async () => {
        setLoading(true)
        try {
            // Attempt API load
            const data = await cycleCountService.getAllSessions()

            // Allow merging local simulated sessions for Demo/Offline support
            // REMOVED: Simulation merge.

            // Deduplicate by ID just in case
            const allSessions = [...(data || [])]
            const uniqueSessions = Array.from(new Map(allSessions.map(item => [item.id, item])).values())

            // Sort by date desc
            uniqueSessions.sort((a, b) => new Date(b.created_at || b.planned_date) - new Date(a.created_at || a.planned_date))

            // ROLE FILTER:
            // - Admins/Supervisors: See ALL sessions
            // - Toolroom Staff (and others): See ONLY assigned sessions
            const allowedViewAllRoles = ['admin', 'administrator', 'supervisor', 'supervisor_tool']
            const canViewAll = allowedViewAllRoles.includes(effectiveRole)

            const userId = userProfile?.id

            let filteredSessions = uniqueSessions
            if (!canViewAll) {
                // Si NO tiene permiso de ver todo, filtrar por asignación (Whitelisting seguro)
                filteredSessions = uniqueSessions.filter(s => String(s.assigned_to) === String(userId))
            }

            setSessions(filteredSessions)
        } catch (error) {
            console.warn('Backend unavailable, switching to local simulation mode:', error)

            console.error('Backend unavailable:', error)
            toast.error("Could not load sessions. Please check backend connection.")
            setSessions([])
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSession = () => {
        navigate('/cycle-counts/new')
    }

    const canCreate = ['admin', 'administrator', 'supervisor', 'supervisor_tool'].includes(effectiveRole)

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            <PageHeader
                title="CYCLE COUNTS"
                subtitle="Manage inventory audit sessions"
                profile={userProfile}
                bgColor="#0ea5e9" // Sky Blue 500
            />

            {/* Toolbar - Sky Blue Theme */}
            <div className="px-8 py-4 bg-sky-50 border-b border-sky-200 flex flex-col sm:flex-row gap-4 items-center justify-between z-10">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            className="pl-9 pr-4 py-2 w-full rounded-lg border border-sky-200 text-sm focus:ring-sky-500 focus:border-sky-500 bg-white"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">


                    <button
                        onClick={loadSessions}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RotateCw size={20} />
                    </button>

                    {canCreate && (
                        <button
                            onClick={handleCreateSession}
                            disabled={creating}
                            className="bg-sky-600 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:bg-sky-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {creating ? 'Creating...' : 'New Cycle Count'}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-8 z-0 relative">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4">Planned Date</th>
                                <th className="px-6 py-4">Count Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Loading...</td></tr>
                            ) : sessions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="text-slate-300" size={32} />
                                            <span className="font-medium">No active cycle counts found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((session) => {
                                    // 1. Calculate Dynamic Status
                                    let displayStatus = session.status
                                    let statusColor = "bg-slate-50 text-slate-700 border-slate-200"

                                    if (session.status === 'assigned') {
                                        const totalLines = session.lines?.length || 0
                                        const countedLines = session.lines?.filter(l => l.qty_physical !== null && l.qty_physical !== undefined).length || 0

                                        if (totalLines > 0 && countedLines === totalLines) {
                                            displayStatus = 'CLOSED'
                                            statusColor = "bg-green-50 text-green-700 border-green-200"
                                        } else if (countedLines > 0) {
                                            displayStatus = 'IN PROGRESS'
                                            statusColor = "bg-blue-50 text-blue-700 border-blue-200"
                                        } else {
                                            displayStatus = 'PENDING'
                                            statusColor = "bg-amber-50 text-amber-700 border-amber-200"
                                        }
                                    } else if (session.status === 'DRAFT') {
                                        statusColor = "bg-amber-50 text-amber-700 border-amber-200"
                                    } else if (session.status === 'COMPLETED' || session.status === 'CLOSED') {
                                        statusColor = "bg-green-50 text-green-700 border-green-200"
                                    }

                                    // 2. Calculate Max Count Date
                                    let maxCountDate = null
                                    if (session.lines && session.lines.length > 0) {
                                        const dates = session.lines
                                            .map(l => l.count_date)
                                            .filter(d => d)
                                            .sort()
                                        if (dates.length > 0) {
                                            maxCountDate = dates[dates.length - 1]
                                        }
                                    }

                                    return (
                                        <tr key={session.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono text-xs">
                                                    {session.ticket_id || session.id.slice(0, 8)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="font-medium">{session.created_at?.split('T')[0].split('-').reverse().join('/')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-700">
                                                {session.planned_date ? (
                                                    <div className="flex items-center gap-2 text-sky-600 font-bold bg-sky-50 px-2 py-1 rounded w-fit">
                                                        <Calendar size={14} className="text-sky-500" />
                                                        <span>{session.planned_date.split('-').reverse().join('/')}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-700">
                                                {maxCountDate ? (
                                                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        <span>{maxCountDate.split('T')[0].split('-').reverse().join('/')}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Not started</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
                                                    {displayStatus.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" />
                                                    {session.created_by_profile?.full_name || session.created_by_profile?.email || session.created_by_user?.email || 'System'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link to={`/cycle-counts/${session.id}`} className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1 p-1 hover:bg-sky-50 rounded transition-colors">
                                                    Open <ArrowRight size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
