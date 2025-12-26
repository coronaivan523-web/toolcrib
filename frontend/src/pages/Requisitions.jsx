import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Search, RotateCw, Filter, Eye, AlertCircle, Plus, ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import { requisitionService } from '../services/requisitions'
import { supabase } from '../lib/supabase'
import RequisitionDetailModal from '../components/RequisitionDetailModal'
import RequisitionFormModal from '../components/RequisitionFormModal'

export default function Requisitions() {
    const { userProfile } = useOutletContext()
    const canCreate = ['supervisor', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician'].includes(userProfile?.role?.trim().toLowerCase())

    // State
    const [requisitions, setRequisitions] = useState([])
    const [materials, setMaterials] = useState({}) // ID -> { name, part_number }
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

    // Fetch Data
    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            // 1. Fetch Requisitions
            let reqData = []
            if (viewMode === 'inbox') {
                reqData = await requisitionService.getInbox()
            } else {
                reqData = await requisitionService.listRequisitions({
                    status: statusFilter !== 'all' ? statusFilter : undefined
                })
            }
            setRequisitions(reqData)

            // 2. Fetch Materials for Mapping (Lightweight)
            // Added unit_of_measure to fix population issue reported by user
            const { data: matData } = await supabase
                .from('materials')
                .select('id, name, part_number, description, image_url, unit, unit_of_measure')

            if (matData) {
                const matMap = {}
                matData.forEach(m => {
                    // Fix Image URL: Prepend Supabase Storage URL if it's just a filename
                    let finalImageUrl = m.image_url
                    if (m.image_url && !m.image_url.startsWith('http')) {
                        finalImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${m.image_url}`
                    }

                    // Map unit_of_measure to unit to ensure compatibility with RequisitionFormModal
                    matMap[m.id] = {
                        ...m,
                        image_url: finalImageUrl,
                        unit: m.unit_of_measure || m.unit || 'EA',
                        uom: m.unit_of_measure // Ensure fallback
                    }
                })
                setMaterials(matMap)
            }

        } catch (err) {
            console.error("Error fetching requisitions:", err)
            console.error("[Requisitions.jsx] Load error details:", err.name, err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [statusFilter, viewMode]) // Refetch on status or view change

    // Client-side Filtering for others
    const filteredRequisitions = requisitions.filter(req => {
        const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter
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
            material_name: materials[item.material_id]?.name || 'Unknown Material',
            part_number: materials[item.material_id]?.part_number || 'N/A'
        }))

        setSelectedReq({ ...req, items: hydratedItems })
        setIsDetailOpen(true)
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-primary-100 px-8 py-5 shadow-sm z-20 relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-primary-50 p-2.5 rounded-lg border border-primary-100 text-primary-600">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Requisitions</h1>
                        <p className="text-slate-500 text-sm font-medium">Manage and approve material requests</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RotateCw size={20} />
                    </button>

                    {canCreate && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:bg-primary-700 transition-colors flex items-center gap-2">
                            <Plus size={18} />
                            Create Requisition
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-8 py-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between z-10">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search by REQ # or Requester..."
                            className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:ring-primary-500 focus:border-primary-500"
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
                                viewMode === 'inbox' ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}>
                            Inbox
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            className="text-sm border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="UNDER_APPROVAL">Under Approval</option>
                            <option value="APPROVED_PRE_PURCHASE">Approved</option>
                            <option value="REWORK_REQUIRED">Rework Required</option>
                            <option value="CANCELED">Canceled</option>
                            <option value="REJECTED_FINAL">Rejected</option>
                        </select>

                        <select
                            className="text-sm border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="all">All Priority</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                            <option value="LOW">Low</option>
                        </select>
                    </div>
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
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Priority</th>
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
                                                                    "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                {req.status?.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={clsx("font-bold text-xs inline-flex items-center gap-1",
                                                req.priority === 'URGENT' ? 'text-red-600' :
                                                    req.priority === 'HIGH' ? 'text-orange-600' :
                                                        'text-slate-600'
                                            )}>
                                                {req.priority === 'URGENT' && <AlertCircle size={12} />}
                                                {req.priority}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {req.requester?.full_name || req.requester?.email || 'Unknown'}
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
                currentUser={userProfile}
                onActionSuccess={fetchData}
            />

            {/* Create Modal */}
            <RequisitionFormModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchData}
                materials={materials}
                currentUser={userProfile}
            />
        </div>
    )
}
