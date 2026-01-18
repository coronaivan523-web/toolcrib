import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cycleCounts } from '../../services/cycleCounts'
import { materialService } from '../../services/materials'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Check, X, Plus, Trash2, Save, AlertTriangle, User, Search } from 'lucide-react'
import MaterialAutocomplete from '../../components/MaterialAutocomplete'
import clsx from 'clsx'
import { useOutletContext } from 'react-router-dom'

export default function CycleCountDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userProfile } = useOutletContext()

    const [session, setSession] = useState(null)
    const [lines, setLines] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // For Add Line
    const [allMaterials, setAllMaterials] = useState([])
    const [allLocations, setAllLocations] = useState([]) // We might need to fetch this
    // Filter States
    const [filters, setFilters] = useState({
        description: '',
        partNumber: '',
        process: '',
        area: '',
        machine: ''
    })

    // Filter Options (computed from materials)
    const [filterOptions, setFilterOptions] = useState({
        processes: [],
        areas: [],
        machines: []
    })

    // Local state to hold quantity inputs for each material in the catalog view
    const [catalogQuantities, setCatalogQuantities] = useState({})

    const [newLine, setNewLine] = useState({
        materialId: null,
        locationId: '',
        qtyPhysical: ''
    })

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        try {
            const sessionData = await cycleCounts.getSessionById(id)
            setSession(sessionData)
            setLines(sessionData.lines || [])

            // Load materials for autocomplete
            const mats = await materialService.getMaterials()
            setAllMaterials(mats)

            // Extract Unique Filter Options
            const processes = [...new Set(mats.map(m => m.process).filter(Boolean))].sort()
            const areas = [...new Set(mats.map(m => m.area).filter(Boolean))].sort()
            const machines = [...new Set(mats.map(m => m.machine_asset).filter(Boolean))].sort()
            setFilterOptions({ processes, areas, machines })

            // Load locations (simple fetch for now)
            const { data: locs } = await supabase.from('locations').select('*').order('code')
            setAllLocations(locs || [])

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAddFromCatalog = async (material, qty) => {
        if (!qty || qty === '' || isNaN(qty)) {
            alert('Please enter a quantity')
            return
        }

        // Auto-select location or force selection?
        // Logic: Try to find default location, else use first one or require user context?
        // User image shows "Stock" and "Qty" but no Location input in row.
        // Assuming default material location ID or string matching?
        // For now, if material has location_id use it, otherwise warn or use first available (dangerous).
        // Let's fallback to 'Unknown' or ask user if critical.
        // Schema shows material.location_id.

        let locId = material.location_id
        if (!locId && allLocations.length > 0) {
            // Fallback: Try match location name
            if (material.location) {
                const found = allLocations.find(l => l.code === material.location)
                if (found) locId = found.id
            }
        }

        if (!locId) {
            if (allLocations.length > 0) locId = allLocations[0].id // Fallback to first
            else {
                alert('No locations defined in system')
                return
            }
        }

        try {
            await cycleCounts.addLine(id, {
                material_id: material.id,
                location_id: locId,
                qty_physical: parseFloat(qty)
            })

            loadData()
            setCatalogQuantities(prev => ({ ...prev, [material.id]: '' })) // Clear input
        } catch (err) {
            alert(err.message)
        }
    }

    const handleClearFilters = () => {
        setFilters({
            description: '',
            partNumber: '',
            process: '',
            area: '',
            machine: ''
        })
    }

    const handleDeleteLine = async (lineId) => {
        if (!confirm('Are you sure?')) return
        try {
            await cycleCounts.deleteLine(id, lineId)
            setLines(lines.filter(l => l.id !== lineId))
        } catch (err) {
            alert(err.message)
        }
    }

    const handleSubmit = async () => {
        if (!confirm('Submit this session for approval? You cannot edit lines after submission.')) return
        try {
            await cycleCounts.submitSession(id)
            loadData()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleApprove = async () => {
        if (!confirm('Approve and adjust inventory? This is irreversible.')) return
        try {
            await cycleCounts.approveSession(id)
            loadData()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleReject = async () => {
        if (!confirm('Reject this session? No changes will be made.')) return
        try {
            await cycleCounts.rejectSession(id)
            loadData()
        } catch (err) {
            alert(err.message)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (error) return <div className="p-8 text-red-600">Error: {error}</div>
    if (!session) return <div className="p-8">Session not found</div>

    const isDraft = session.status === 'DRAFT'
    const isSubmitted = session.status === 'SUBMITTED'
    const isApprover = userProfile?.role === 'admin' || userProfile?.role === 'supervisor'

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
                    {userProfile && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4 bg-primary-800/40 rounded-full pr-6 pl-2 py-1.5 border border-primary-700/50 shadow-sm">
                            <div className="h-12 w-12 rounded-full ring-2 ring-white/20 overflow-hidden bg-primary-700 flex items-center justify-center shrink-0">
                                {userProfile.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-7 w-7 text-primary-300" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm tracking-wide leading-tight">
                                    {userProfile.full_name || 'User'}
                                </span>
                                <span className="text-primary-300 text-[10px] font-medium uppercase tracking-wider">
                                    {userProfile.role || 'User'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Page Title Section */}
                    <div className="text-center">
                        <h1 className="text-2xl font-extrabold text-white tracking-widest leading-tight uppercase">
                            SESSION DETAIL
                        </h1>
                        <p className="text-primary-200 mt-0 text-sm font-medium tracking-wide">#{session.id.slice(0, 8)}</p>
                    </div>
                </div>

                {/* Toolbar inside Header */}
                <div className="px-6 pb-0 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 border-t border-white/5 text-white backdrop-blur-sm">
                    <div className="relative max-w-xs w-full mt-2 mb-2 flex items-center gap-6">
                        <button onClick={() => navigate('/cycle-counts')} className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                            <ArrowLeft size={14} strokeWidth={3} /> Back to List
                        </button>
                        <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                            session.status === 'DRAFT' ? "bg-white/10 text-slate-200 border-white/20" :
                                session.status === 'SUBMITTED' ? "bg-blue-500/20 text-blue-100 border-blue-400/30" :
                                    session.status === 'APPROVED' ? "bg-green-500/20 text-green-100 border-green-400/30" :
                                        "bg-red-500/20 text-red-100 border-red-400/30"
                        )}>{session.status}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 mb-2">
                        {isDraft && (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 text-xs font-bold shadow-lg border border-blue-400"
                            >
                                <Save size={14} strokeWidth={3} /> Submit Session
                            </button>
                        )}
                        {isSubmitted && isApprover && (
                            <>
                                <button
                                    onClick={handleReject}
                                    className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-500 text-xs font-bold shadow-lg border border-red-400"
                                >
                                    <X size={14} strokeWidth={3} /> Reject
                                </button>
                                <button
                                    onClick={handleApprove}
                                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-500 text-xs font-bold shadow-lg border border-green-400"
                                >
                                    <Check size={14} strokeWidth={3} /> Approve Adjustment
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-7xl mx-auto w-full overflow-y-auto space-y-6">

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sys Qty</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Phys Qty</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                                {isDraft && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {lines.map(line => (
                                <tr key={line.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{line.material_name}</div>
                                        <div className="text-xs text-gray-500">{line.material_part_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{line.location_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 text-right">{line.qty_system}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{line.qty_physical}</td>
                                    <td className={clsx(
                                        "px-6 py-4 text-sm font-bold text-right",
                                        line.variance === 0 ? "text-gray-400" : line.variance > 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {line.variance > 0 ? '+' : ''}{line.variance}
                                    </td>
                                    {isDraft && (
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteLine(line.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}

                            {/* Removed Manual Add Row in favor of Catalog below */}
                        </tbody>
                    </table>
                    {lines.length === 0 && !isDraft && (
                        <div className="p-8 text-center text-gray-500">No lines recorded.</div>
                    )}
                </div>

                {/* Material Catalog / Visual Verification Section */}
                {isDraft && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                <Search size={20} className="text-primary-600" />
                                Material Catalog Search
                            </h3>
                            <button onClick={handleClearFilters} className="text-xs text-red-500 hover:text-red-700 font-bold uppercase">
                                Clear Filters
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="p-6 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shadow-sm z-10 relative">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Search description..."
                                    value={filters.description}
                                    onChange={e => setFilters(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Part Number</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Search part #..."
                                    value={filters.partNumber}
                                    onChange={e => setFilters(prev => ({ ...prev, partNumber: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Process</label>
                                <select
                                    className="w-full rounded-md border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    value={filters.process}
                                    onChange={e => setFilters(prev => ({ ...prev, process: e.target.value }))}
                                >
                                    <option value="">- All -</option>
                                    {filterOptions.processes.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Area</label>
                                <select
                                    className="w-full rounded-md border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    value={filters.area}
                                    onChange={e => setFilters(prev => ({ ...prev, area: e.target.value }))}
                                >
                                    <option value="">- All -</option>
                                    {filterOptions.areas.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Machine</label>
                                <select
                                    className="w-full rounded-md border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    value={filters.machine}
                                    onChange={e => setFilters(prev => ({ ...prev, machine: e.target.value }))}
                                >
                                    <option value="">- All -</option>
                                    {filterOptions.machines.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Catalog Table */}
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-blue-50/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider">Part #</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Process</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-green-700 uppercase">Stock</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-blue-800 uppercase tracking-wider w-32">Phys Qty</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {allMaterials.filter(m => {
                                        const matchDesc = !filters.description || m.name.toLowerCase().includes(filters.description.toLowerCase())
                                        const matchPart = !filters.partNumber || (m.part_number && m.part_number.toLowerCase().includes(filters.partNumber.toLowerCase()))
                                        const matchProcess = !filters.process || m.process === filters.process
                                        const matchArea = !filters.area || m.area === filters.area
                                        const matchMachine = !filters.machine || m.machine_asset === filters.machine
                                        return matchDesc && matchPart && matchProcess && matchArea && matchMachine
                                    }).slice(0, 100).map(mat => ( // Limit to 100 to prevent lag
                                        <tr key={mat.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-3 text-sm font-bold text-slate-700">{mat.part_number}</td>
                                            <td className="px-6 py-3 text-sm text-gray-600">{mat.name}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500">{mat.process}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500">{mat.area}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500">{mat.machine_asset}</td>
                                            <td className="px-6 py-3 text-sm font-bold text-green-600 text-right">{mat.current_stock}</td>
                                            <td className="px-6 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full rounded border-gray-300 text-sm text-right focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white"
                                                    placeholder="0"
                                                    value={catalogQuantities[mat.id] || ''}
                                                    onChange={e => setCatalogQuantities({ ...catalogQuantities, [mat.id]: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAddFromCatalog(mat, catalogQuantities[mat.id])
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-2 text-center">
                                                <button
                                                    onClick={() => handleAddFromCatalog(mat, catalogQuantities[mat.id])}
                                                    className="bg-blue-100 text-blue-700 p-1.5 rounded-md hover:bg-blue-200 transition-colors shadow-sm active:translate-y-0.5"
                                                    title="Add to Count"
                                                >
                                                    <Plus size={18} strokeWidth={3} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allMaterials.length === 0 && (
                                        <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">No materials found via API.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
