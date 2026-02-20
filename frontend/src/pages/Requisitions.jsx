import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, RotateCw, Filter, Eye, AlertCircle, Plus, ClipboardList, X } from 'lucide-react'
import clsx from 'clsx'
import { requisitionService } from '../services/requisitions'
import { supabase } from '../lib/supabase'
import RequisitionDetailModal from '../components/RequisitionDetailModal'
import RequisitionFormModal from '../components/RequisitionFormModal'
import PageHeader from '../components/PageHeader'

export default function Requisitions() {
    const { userProfile } = useOutletContext()
    const canCreate = ['admin', 'administrator', 'supervisor', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician', 'staff_level_1', 'staff_level_2', 'seguridad'].includes(userProfile?.role?.trim().toLowerCase())

    // State
    const [requisitions, setRequisitions] = useState([])
    const [inboxCount, setInboxCount] = useState(0)
    const [materials, setMaterials] = useState({}) // ID -> { name, part_number }
    const [usersMap, setUsersMap] = useState({}) // ID -> Name/Email
    const [usersList, setUsersList] = useState([]) // Array of user objects
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Modal
    const [selectedReq, setSelectedReq] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    // View Mode
    const [viewMode, setViewMode] = useState('all') // 'all' | 'inbox'

    // Fetch just the requisitions (Fast Refresh)
    const fetchRequisitions = async () => {
        setLoading(true)
        setError(null)
        try {
            let reqData = []
            if (viewMode === 'inbox') {
                reqData = await requisitionService.getInbox()
            } else {
                reqData = await requisitionService.listRequisitions({
                    status: statusFilter !== 'all' ? statusFilter : undefined
                })
            }

            // --- ROLE BASED FILTERING ---
            // Backend already handles filtering for non-privileged users via RequisitionService.
            // We trust the API to return the correct list (My Reqs + My Approved Reqs).
            // Removing redundant client-side filtering which was causing issues.
            // -----------------------------

            setRequisitions(reqData)

            // Inbox Count (Fast)
            try {
                const inboxData = await requisitionService.getInbox()
                setInboxCount(inboxData.length)
            } catch (ignore) { console.warn("Failed to fetch inbox count", ignore) }

            // Update selectedReq if open (Refresh Modal)
            if (isDetailOpen && selectedReq) {
                const updatedSelected = reqData.find(r => r.id === selectedReq.id)
                if (updatedSelected) {
                    // Re-hydrate items (maintain consistency with handleOpenDetail)
                    const hydratedItems = updatedSelected.items?.map(item => ({
                        ...item,
                        material_name: materials[item.material_id]?.name || item.material?.name || 'Unknown Material',
                        part_number: materials[item.material_id]?.part_number || item.material?.part_number || 'N/A'
                    }))
                    setSelectedReq({ ...updatedSelected, items: hydratedItems })
                }
            }

        } catch (err) {
            console.error("Error fetching requisitions:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Fetch Static Data (Materials, Users) - Run Once
    const fetchStaticData = async () => {
        try {
            // 2. Fetch Materials for Mapping (Lightweight)
            const { data: matData } = await supabase
                .from('materials')
                .select('id, name, part_number, description, image_url, unit, unit_of_measure, category, material_type')

            if (matData) {
                const matMap = {}
                matData.forEach(m => {
                    let finalImageUrl = m.image_url
                    if (m.image_url && !m.image_url.startsWith('http')) {
                        finalImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${m.image_url}`
                    }
                    matMap[m.id] = {
                        ...m,
                        image_url: finalImageUrl,
                        unit: m.unit_of_measure || m.unit || 'EA',
                        uom: m.unit_of_measure
                    }
                })
                setMaterials(matMap)
            }

            // 3. Fetch Users for Mapping (Approvers)
            const users = await requisitionService.getUsers()
            if (users) {
                const uMap = {}
                users.forEach(u => {
                    uMap[u.id] = u.full_name || u.email
                })
                setUsersList(users)
                setUsersMap(uMap)
            }
        } catch (e) {
            console.error("Error loading static data:", e)
        }
    }

    // Initial Fetch and Realtime Subscription
    useEffect(() => {
        fetchStaticData()
        fetchRequisitions()

        // Realtime Subscription
        const channel = supabase
            .channel('requisitions-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'requisitions' },
                (payload) => {
                    console.log('Realtime change in requisitions:', payload)
                    fetchRequisitions()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'requisition_approvals' },
                (payload) => {
                    console.log('Realtime change in approvals:', payload)
                    fetchRequisitions()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [statusFilter, priorityFilter, viewMode, userProfile]) // Refetch on status or view change or profile load

    // Client-side Filtering for others
    const filteredRequisitions = requisitions.filter(req => {
        const matchesPriority = priorityFilter === 'all' || req.criticality_requested === priorityFilter
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
            (req.req_number?.toLowerCase().includes(searchLower)) ||
            (req.requester?.full_name?.toLowerCase().includes(searchLower)) ||
            (String(req.folio).includes(searchLower))

        return matchesPriority && matchesSearch
    })

    const handleOpenDetail = (req) => {
        // Hydrate items with material names
        const hydratedItems = req.items?.map(item => ({
            ...item,
            material_name: materials[item.material_id]?.name || item.material?.name || 'Unknown Material',
            part_number: materials[item.material_id]?.part_number || item.material?.part_number || 'N/A'
        }))

        setSelectedReq({ ...req, items: hydratedItems })
        setIsDetailOpen(true)
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <PageHeader
                title="REQUISITIONS"
                subtitle="Manage and approval material requests"
                profile={userProfile}
                bgColor="#0d9488"
            />

            {/* Toolbar */}
            <div className="px-8 py-4 bg-teal-50 border-b border-teal-200 flex flex-col sm:flex-row gap-4 items-center justify-between z-10">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search by REQ # or Requester..."
                            className="pl-9 pr-4 py-2 w-full rounded-lg border border-teal-200 text-sm focus:ring-teal-500 focus:border-teal-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('all')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                viewMode === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}>
                            All
                        </button>
                        <button
                            onClick={() => setViewMode('inbox')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                                viewMode === 'inbox' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-teal-700"
                            )}>
                            Inbox
                            {inboxCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                    {inboxCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {(statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
                        <button
                            onClick={() => {
                                setStatusFilter('all')
                                setPriorityFilter('all')
                                setSearchTerm('')
                            }}
                            className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Clear All Filters"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    )}


                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRequisitions}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RotateCw size={20} />
                    </button>

                    {canCreate && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:bg-teal-700 transition-colors flex items-center gap-2">
                            <Plus size={18} />
                            Create Requisition
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area - Table */}
            <div className="flex-1 overflow-auto p-8 z-0 relative">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">REQ #</th>
                                <th className="px-6 py-4">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="bg-transparent border-none text-slate-500 font-medium text-sm focus:ring-0 p-0 cursor-pointer outline-none hover:text-teal-600 transition-colors w-auto"
                                    >
                                        <option value="all">STATUS</option>
                                        <option value="DRAFT">DRAFT</option>
                                        <option value="UNDER_APPROVAL">UNDER APPROVAL</option>
                                        <option value="APPROVED_PRE_PURCHASE">APPROVED PRE PURCHASE</option>
                                        <option value="PARTIALLY_RECEIVED">INCOMPLETE</option>
                                        <option value="RECEIVED">RECEIVED</option>
                                        <option value="REWORK_REQUIRED">REWORK REQUIRED</option>
                                        <option value="CANCELED">CANCELED</option>
                                        <option value="REJECTED_FINAL">CANCELED</option>
                                    </select>
                                </th>
                                <th className="px-6 py-4">
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                        className="bg-transparent border-none text-slate-500 font-medium text-sm focus:ring-0 p-0 cursor-pointer outline-none hover:text-teal-600 transition-colors w-auto"
                                    >
                                        <option value="all">Priority</option>
                                        <option value="C1">C1 - Normal</option>
                                        <option value="C2">C2 - Urgent</option>
                                        <option value="C3">C3 - Critical</option>
                                        <option value="C4">C4 - Special Project</option>
                                    </select>
                                </th>
                                <th className="px-6 py-4">Requester</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        Loading requisitions...
                                    </td>
                                </tr>
                            ) : filteredRequisitions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-4xl">📭</span>
                                            <span className="font-medium">No requisitions found</span>
                                            <span className="text-xs">Try adjusting filters or create a new one.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequisitions.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleOpenDetail(req)}>
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {req.req_number || <span className="text-slate-400 italic">Draft</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                                req.status === 'DRAFT' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                    req.status === 'UNDER_APPROVAL' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        req.status === 'APPROVED_PRE_PURCHASE' ? "bg-green-50 text-green-700 border-green-200" :
                                                            req.status === 'REWORK_REQUIRED' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                req.status === 'REJECTED_FINAL' ? "bg-red-50 text-red-700 border-red-200" :
                                                                    req.status === 'PARTIALLY_RECEIVED' ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                                        "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                {req.status === 'PARTIALLY_RECEIVED' ? 'INCOMPLETE' : req.status === 'REJECTED_FINAL' ? 'CANCELED' : req.status?.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const criticality = req.criticality_requested || 'C1'
                                                const labels = {
                                                    'C1': { text: 'C1 - Normal', style: 'text-slate-600 bg-slate-100 border-slate-200' },
                                                    'C2': { text: 'C2 - Urgente', style: 'text-amber-700 bg-amber-50 border-amber-200' },
                                                    'C3': { text: 'C3 - Crítico', style: 'text-red-700 bg-red-50 border-red-200' },
                                                    'C4': { text: 'C4 - Proy. Esp.', style: 'text-purple-700 bg-purple-50 border-purple-200' },
                                                }
                                                // Fallback
                                                const config = labels[criticality] || labels['C1']

                                                return (
                                                    <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-md border", config.style)}>
                                                        {config.text}
                                                    </span>
                                                )
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {req.requester_name || req.requester?.full_name || req.requester?.email || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {new Date(req.submitted_at || req.created_at).toLocaleDateString()}
                                            <div className="text-[10px] text-slate-400">
                                                {new Date(req.submitted_at || req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenDetail(req); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            <RequisitionDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                requisition={selectedReq}
                materials={materials}
                usersMap={usersMap}
                currentUser={userProfile}
                onActionSuccess={fetchRequisitions}
            />

            <RequisitionFormModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchRequisitions}
                materials={materials}
                users={usersList}
                currentUser={userProfile}
            />


        </div >
    )
}
