import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cycleCounts } from '../../services/cycleCounts'
import { materialService } from '../../services/materials'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Check, CheckCircle, X, Plus, Trash2, Save, AlertTriangle, User, Search, ListPlus } from 'lucide-react'
import MaterialAutocomplete from '../../components/MaterialAutocomplete'
import clsx from 'clsx'
import { useOutletContext } from 'react-router-dom'

export default function CycleCountDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userProfile } = useOutletContext()

    const [activeSessionId, setActiveSessionId] = useState(id)

    const [session, setSession] = useState(null)
    const [lines, setLines] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // For Add Line
    const [allMaterials, setAllMaterials] = useState([])
    const [allLocations, setAllLocations] = useState([]) // We might need to fetch this
    // Filter States
    const [sessionSearch, setSessionSearch] = useState('')
    const [filters, setFilters] = useState({
        description: '',
        partNumber: '',
        process: '',
        area: '',
        machine: '',
        location: '',
        planned: '',
        user: ''
    })
    const [showLowStockOnly, setShowLowStockOnly] = useState(false)

    // Filter Options (computed from materials)
    const [filterOptions, setFilterOptions] = useState({
        processes: [],
        areas: [],
        machines: []
    })

    const [showCatalog, setShowCatalog] = useState(false)

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
            // Parallelize fetching to process faster
            const promises = [
                materialService.getMaterials(),
                supabase.from('locations').select('*').order('code')
            ]

            let sessionId = id



            // REMOVED: Automatic Draft Search. 
            // The user wants NO "Session Process" on load.
            // We load materials and wait for user action to establish context.

            // Only fetch session if we have an ID
            if (sessionId) {
                promises.push(cycleCounts.getSessionById(sessionId))
            } else {
                promises.push(Promise.resolve(null)) // resolve null for session
            }

            // Await all data
            const [mats, locsResult, sessionData] = await Promise.all(promises)

            // Set Materials & Options
            setAllMaterials(mats)
            const processes = [...new Set(mats.map(m => m.process).filter(Boolean))].sort()
            const areas = [...new Set(mats.map(m => m.area).filter(Boolean))].sort()
            const machines = [...new Set(mats.map(m => m.machine_asset).filter(Boolean))].sort()
            setFilterOptions({ processes, areas, machines })

            // Set Locations
            setAllLocations(locsResult.data || [])

            // Set Session Data (if found)
            if (sessionId && sessionData) {
                setActiveSessionId(sessionId)
                setSession(sessionData)
                setLines(sessionData.lines || [])
            } else {
                setActiveSessionId(null)
                setSession(null)
                setLines([])
            }

        } catch (err) {
            console.error("Error loading cycle count data:", err)
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
            let targetSessionId = activeSessionId

            // Lazy Creation: If no session exists, create one NOW.
            if (!targetSessionId) {
                const today = new Date().toISOString().split('T')[0]
                const newSession = await cycleCounts.createSession({
                    count_date: today,
                    notes: 'Auto-Created Session',
                    location_scope: 'All'
                })
                targetSessionId = newSession.id
                setActiveSessionId(targetSessionId)
                setSession(newSession)
            }

            await cycleCounts.addLine(targetSessionId, {
                material_id: material.id,
                location_id: locId,
                qty_physical: parseFloat(qty)
            })

            // Reload data to reflect changes (lines will be fetched in this call if we pass the ID, or we simple recall with current logic)
            // But loadData uses 'id' param or 'activeSessionId' state?
            // loadData reads from URL params 'id'. 
            // We need to update lines manually or refactor loadData to accept an ID override.

            // Simpler: Just fetch the fresh session data directly here
            const sessionData = await cycleCounts.getSessionById(targetSessionId)
            setSession(sessionData)
            setLines(sessionData.lines || [])

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
            await cycleCounts.deleteLine(activeSessionId, lineId)
            setLines(lines.filter(l => l.id !== lineId))
        } catch (err) {
            alert(err.message)
        }
    }

    const handleSubmit = async () => {
        // Confirmation removed for direct access
        try {
            await cycleCounts.submitSession(id)
            loadData()
        } catch (err) {
            alert(err.message)
        }
    }

    // Render Helpers
    // If no session, we are technically in a "Draft/New" state effectively
    const isDraft = !session || session?.status === 'DRAFT'
    // isSubmitted/isApprover removed as workflow is now direct Process action

    // If no session but not loading, show empty state or create prompt
    const showEmptyState = !loading && !session;




    const filteredLines = lines.filter(line => {
        const mat = allMaterials.find(m => m.id === line.material_id) || {}

        const matchPart = !filters.partNumber || (line.material_part_number || '').toLowerCase().includes(filters.partNumber.toLowerCase())
        const matchDesc = !filters.description || (line.material_name || '').toLowerCase().includes(filters.description.toLowerCase())
        const matchLoc = !filters.location || (line.location_name || '').toLowerCase().includes(filters.location.toLowerCase())

        const matchProcess = !filters.process || (mat.process === filters.process)
        const matchArea = !filters.area || (mat.area === filters.area)
        const matchMachine = !filters.machine || (mat.machine_asset === filters.machine)

        const matchPlanned = !filters.planned || (line.planned_date || '').includes(filters.planned)
        const matchUser = !filters.user || (line.counted_by_name || '').toLowerCase().includes(filters.user.toLowerCase())

        const matchStock = !showLowStockOnly || (line.qty_system <= 5)

        return matchPart && matchDesc && matchLoc && matchProcess && matchArea && matchMachine && matchPlanned && matchUser && matchStock
    })

    return (
        <div className="flex flex-col h-full bg-[#fdfbf6] overflow-hidden">
            {/* Unified Header */}
            <div className="shadow-md z-30 shrink-0" style={{ backgroundColor: '#6b5d4f' }}>
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
                            CYCLE COUNT
                        </h1>
                        <p className="text-primary-200 mt-0 text-sm font-medium tracking-wide uppercase">
                            {showCatalog ? 'Material Catalog' : 'Adjust Inventory & Stock'}
                        </p>
                    </div>
                </div>

                {/* Toolbar inside Header */}
                <div className="px-6 pb-0 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 border-t border-white/10 text-white backdrop-blur-sm">
                    <div className="flex items-center gap-2 mt-2 mb-2">
                        {isDraft && (
                            <>
                                <button
                                    onClick={() => setShowCatalog(!showCatalog)}
                                    // ... existing styling ...
                                    className={clsx(
                                        "px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm border",
                                        showCatalog
                                            ? "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200"
                                            : "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-400"
                                    )}
                                >
                                    {showCatalog ? 'HIDE CATALOG' : 'LOAD ITEMS'}
                                </button>
                                {/* Process Button Removed: Inventory updates real-time now */}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-0 overflow-auto relative">
                {/* Loading Overlay */}


                {/* Error State */}
                {error && (
                    <div className="p-8 flex justify-center">
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md border border-red-200 flex items-center gap-2">
                            <AlertTriangle size={20} />
                            {error}
                        </div>
                    </div>
                )}

                {/* Content */}
                {!showCatalog && (
                    <div className="bg-white shadow-none min-h-full">
                        {/* Session Search Header */}
                        {/* Session Header Removed */}


                        <table className="w-full divide-y divide-stone-200 border-collapse text-center text-[10px]">
                            <thead className="bg-[#f0fdfa] border-b-2 border-stone-300">
                                <tr>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">Part #</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Filter..."
                                            value={filters.partNumber}
                                            onChange={e => setFilters(prev => ({ ...prev, partNumber: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">Description</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Filter..."
                                            value={filters.description}
                                            onChange={e => setFilters(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">Location</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Filter..."
                                            value={filters.location}
                                            onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-600 uppercase mb-1">Process</div>
                                        <select
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                                            value={filters.process}
                                            onChange={e => setFilters(prev => ({ ...prev, process: e.target.value }))}
                                        >
                                            <option value=""></option>
                                            {filterOptions.processes.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-600 uppercase mb-1">Area</div>
                                        <select
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                                            value={filters.area}
                                            onChange={e => setFilters(prev => ({ ...prev, area: e.target.value }))}
                                        >
                                            <option value=""></option>
                                            {filterOptions.areas.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-600 uppercase mb-1">Machine</div>
                                        <select
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                                            value={filters.machine}
                                            onChange={e => setFilters(prev => ({ ...prev, machine: e.target.value }))}
                                        >
                                            <option value=""></option>
                                            {filterOptions.machines.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200 w-28">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase mb-1">Stock</div>
                                        <div className="flex justify-center pb-0.5">
                                            <button
                                                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                                                className={clsx(
                                                    "p-1 rounded-md transition-colors border",
                                                    showLowStockOnly
                                                        ? "bg-red-100 border-red-200 text-red-600 shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                )}
                                                title="Toggle Low Stock (<= 5)"
                                            >
                                                <AlertTriangle size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-bold text-blue-800 uppercase tracking-wider border-r border-stone-200 w-28">
                                        <div className="mb-2">Real Qty</div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-bold text-slate-800 uppercase tracking-wider border-r border-stone-200">
                                        <div className="mb-2">Adjustment</div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">Planned</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Date..."
                                            value={filters.planned}
                                            onChange={e => setFilters(prev => ({ ...prev, planned: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-medium text-stone-500 uppercase border-r border-stone-200">
                                        <div className="mb-2">Real Date</div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">User</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="User..."
                                            value={filters.user}
                                            onChange={e => setFilters(prev => ({ ...prev, user: e.target.value }))}
                                        />
                                    </th>
                                    {isDraft && <th className="px-2 py-2 text-center align-bottom text-[11px] font-medium text-stone-500 uppercase"><div className="mb-2">Action</div></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredLines.map(line => {
                                    const mat = allMaterials.find(m => m.id === line.material_id) || {}
                                    const adjustment = (line.qty_physical || 0) - (line.qty_system || 0)
                                    const isPositive = adjustment > 0
                                    const isNegative = adjustment < 0

                                    return (
                                        <tr key={line.id} className="hover:bg-blue-50/20 transition-colors border-b border-stone-200">
                                            <td className="px-2 py-1 text-xs font-bold text-slate-700 border-r border-stone-200 text-center">{line.material_part_number}</td>
                                            <td className="px-2 py-1 text-xs text-stone-700 border-r border-stone-200 text-center">{line.material_name}</td>
                                            <td className="px-2 py-1 border-r border-stone-200 text-center text-xs text-stone-700">
                                                {line.location_name || '-'}
                                            </td>
                                            <td className="px-2 py-1 text-[11px] text-stone-600 border-r border-stone-200 text-center">{mat.process || '-'}</td>
                                            <td className="px-2 py-1 text-[11px] text-stone-600 border-r border-stone-200 text-center">{mat.area || '-'}</td>
                                            <td className="px-2 py-1 text-[11px] text-stone-600 border-r border-stone-200 text-center">{mat.machine_asset || '-'}</td>
                                            <td className="px-2 py-1 text-center border-r border-stone-200 font-mono text-xs w-28">
                                                <span className={clsx(
                                                    "font-bold",
                                                    (line.qty_system <= 5) ? "text-red-600" : "text-slate-700"
                                                )}>
                                                    {line.qty_system}
                                                </span>
                                                {line.qty_system <= 5 && <span className="ml-1 text-[9px] text-red-500">⚠</span>}
                                            </td>
                                            <td className="px-2 py-1 text-xs font-bold text-blue-900 text-center border-r border-stone-200 bg-white w-28">{line.qty_physical}</td>
                                            <td className={clsx(
                                                "px-2 py-1 text-xs font-bold text-center border-r border-stone-200",
                                                isPositive && "text-green-700 bg-green-50/50",
                                                isNegative && "text-red-700 bg-red-50/50",
                                                !isPositive && !isNegative && "text-stone-400"
                                            )}>
                                                {isPositive ? '+' : ''}{adjustment}
                                            </td>
                                            <td className="px-2 py-1 text-[11px] text-stone-500 text-center border-r border-stone-200">
                                                {line.planned_date ? new Date(line.planned_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-2 py-1 text-[11px] text-stone-500 text-center border-r border-stone-200">
                                                {line.created_at ? new Date(line.created_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-2 py-1 text-[11px] text-stone-500 text-center font-medium border-r border-stone-200">
                                                {line.counted_by_name || 'User'}
                                            </td>
                                            {isDraft && (
                                                <td className="px-2 py-1 text-center">
                                                    <button
                                                        onClick={() => handleDeleteLine(line.id)}
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}

                                {/* Removed Manual Add Row in favor of Catalog below */}
                            </tbody>
                        </table>
                        {filteredLines.length === 0 && lines.length > 0 && (
                            <div className="p-8 text-center text-gray-500">No matching items found.</div>
                        )}
                        {lines.length === 0 && !isDraft && (
                            <div className="p-8 text-center text-gray-500">No lines recorded.</div>
                        )}
                    </div>
                )}

                {/* Material Catalog / Visual Verification Section */}
                {isDraft && showCatalog && (
                    <div className="bg-white shadow-none min-h-full">
                        {/* Catalog Table */}
                        <table className="w-full divide-y divide-stone-200 border-collapse text-center text-[10px]">
                            <thead className="bg-[#f0fdfa] border-b-2 border-stone-300 sticky top-0 z-20">
                                <tr>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">Part #</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Filter..."
                                            value={filters.partNumber}
                                            onChange={e => setFilters(prev => ({ ...prev, partNumber: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">Description</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Filter..."
                                            value={filters.description}
                                            onChange={e => setFilters(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">Location</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Filter..."
                                            value={filters.location}
                                            onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">Process</div>
                                        <select
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                                            value={filters.process}
                                            onChange={e => setFilters(prev => ({ ...prev, process: e.target.value }))}
                                        >
                                            <option value=""></option>
                                            {filterOptions.processes.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">Area</div>
                                        <select
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                                            value={filters.area}
                                            onChange={e => setFilters(prev => ({ ...prev, area: e.target.value }))}
                                        >
                                            <option value=""></option>
                                            {filterOptions.areas.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">Machine</div>
                                        <select
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center"
                                            value={filters.machine}
                                            onChange={e => setFilters(prev => ({ ...prev, machine: e.target.value }))}
                                        >
                                            <option value=""></option>
                                            {filterOptions.machines.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200 w-28">
                                        <div className="text-[11px] font-bold text-slate-800 uppercase mb-1">Stock</div>
                                        <div className="flex justify-center pb-0.5">
                                            <button
                                                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                                                className={clsx(
                                                    "p-1 rounded-md transition-colors border",
                                                    showLowStockOnly
                                                        ? "bg-red-100 border-red-200 text-red-600 shadow-sm"
                                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                )}
                                                title="Toggle Low Stock (<= 5)"
                                            >
                                                <AlertTriangle size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-bold text-blue-800 uppercase tracking-wider border-r border-stone-200 w-28">
                                        <div className="mb-2">Real Qty</div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-bold text-slate-800 uppercase tracking-wider border-r border-stone-200">
                                        <div className="mb-2">Adjustment</div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">Planned</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="Date..."
                                            value={filters.planned}
                                            onChange={e => setFilters(prev => ({ ...prev, planned: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-medium text-stone-500 uppercase border-r border-stone-200">
                                        <div className="mb-2">Real Date</div>
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom border-r border-stone-200">
                                        <div className="text-[11px] font-medium text-stone-500 uppercase mb-1">User</div>
                                        <input
                                            type="text"
                                            className="w-full rounded-sm px-1 py-0.5 text-[11px] border border-stone-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-normal bg-white text-center"
                                            placeholder="User..."
                                            value={filters.user}
                                            onChange={e => setFilters(prev => ({ ...prev, user: e.target.value }))}
                                        />
                                    </th>
                                    <th className="px-2 py-2 text-center align-bottom text-[11px] font-medium text-stone-500 uppercase">
                                        <div className="mb-2">Action</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {allMaterials.filter(m => {
                                    const matchDesc = !filters.description || m.name.toLowerCase().includes(filters.description.toLowerCase())
                                    const matchPart = !filters.partNumber || (m.part_number && m.part_number.toLowerCase().includes(filters.partNumber.toLowerCase()))
                                    const matchProcess = !filters.process || m.process === filters.process
                                    const matchArea = !filters.area || m.area === filters.area
                                    const matchMachine = !filters.machine || m.machine_asset === filters.machine

                                    // New Filters
                                    let locName = '-'
                                    if (m.location_id) {
                                        const l = allLocations.find(x => x.id === m.location_id)
                                        if (l) locName = l.code
                                    } else if (m.location) {
                                        locName = m.location
                                    }
                                    const matchLoc = !filters.location || locName.toLowerCase().includes(filters.location.toLowerCase())
                                    const matchStock = !showLowStockOnly || (m.current_stock <= 5)

                                    return matchDesc && matchPart && matchProcess && matchArea && matchMachine && matchLoc && matchStock
                                }).slice(0, 100).map(mat => {
                                    // Calculate Adjustment Live
                                    const inputVal = catalogQuantities[mat.id]
                                    const hasInput = inputVal !== undefined && inputVal !== ''
                                    const qtyPhys = hasInput ? parseFloat(inputVal) : 0
                                    const adjustment = hasInput ? (qtyPhys - (mat.current_stock || 0)) : 0
                                    const isPositive = adjustment > 0
                                    const isNegative = adjustment < 0

                                    // Find Location logic same as logic above ?
                                    // Try to find location name by ID or name
                                    let locName = '-'
                                    if (mat.location_id) {
                                        const l = allLocations.find(x => x.id === mat.location_id)
                                        if (l) locName = l.code
                                    } else if (mat.location) {
                                        locName = mat.location
                                    }

                                    return (
                                        <tr key={mat.id} className="hover:bg-blue-50/20 transition-colors border-b border-stone-200">
                                            <td className="px-2 py-1 text-xs font-bold text-slate-700 border-r border-stone-200 text-center">{mat.part_number}</td>
                                            <td className="px-2 py-1 text-xs text-stone-700 border-r border-stone-200 text-center">{mat.name}</td>
                                            <td className="px-2 py-1 text-center border-r border-stone-200 text-xs text-stone-700">
                                                {locName}
                                            </td>
                                            <td className="px-2 py-1 text-[11px] text-stone-600 uppercase border-r border-stone-200 text-center">{mat.process}</td>
                                            <td className="px-2 py-1 text-[11px] text-stone-600 uppercase border-r border-stone-200 text-center">{mat.area}</td>
                                            <td className="px-2 py-1 text-[11px] text-stone-600 uppercase border-r border-stone-200 text-center">{mat.machine_asset}</td>
                                            <td className="px-2 py-1 text-center border-r border-stone-200 font-mono text-xs w-28">
                                                <span className={clsx(
                                                    "font-bold",
                                                    (mat.current_stock <= 5) ? "text-red-600" : "text-slate-700"
                                                )}>
                                                    {mat.current_stock}
                                                </span>
                                                {mat.current_stock <= 5 && <span className="ml-1 text-[9px] text-red-500">⚠</span>}
                                            </td>
                                            <td className="px-2 py-1 border-r border-stone-200 text-center w-28">
                                                <input
                                                    type="number"
                                                    className="w-full rounded-sm border-stone-300 text-xs text-center focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm py-0.5"
                                                    placeholder="0"
                                                    value={catalogQuantities[mat.id] || ''}
                                                    onChange={e => setCatalogQuantities({ ...catalogQuantities, [mat.id]: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAddFromCatalog(mat, catalogQuantities[mat.id])
                                                    }}
                                                />
                                            </td>
                                            <td className={clsx(
                                                "px-2 py-1 text-xs font-bold text-center border-r border-stone-200",
                                                isPositive && "text-green-700 bg-green-50/50",
                                                isNegative && "text-red-700 bg-red-50/50",
                                                !isPositive && !isNegative && hasInput && "text-stone-400",
                                                !hasInput && "text-stone-300"
                                            )}>
                                                {hasInput ? (isPositive ? '+' : '') + adjustment : '-'}
                                            </td>
                                            <td className="px-2 py-1 text-[11px] text-stone-400 text-center border-r border-stone-200">-</td>
                                            <td className="px-2 py-1 text-[11px] text-stone-500 text-center border-r border-stone-200">{new Date().toLocaleDateString()}</td>
                                            <td className="px-2 py-1 text-[11px] text-stone-500 text-center border-r border-stone-200">{userProfile?.full_name || 'User'}</td>
                                            <td className="px-2 py-1 text-center">
                                                <button
                                                    onClick={() => handleAddFromCatalog(mat, catalogQuantities[mat.id])}
                                                    className="bg-blue-100 text-blue-700 p-1.5 rounded-md hover:bg-blue-200 transition-colors shadow-sm active:translate-y-0.5"
                                                    title="Add to Count"
                                                >
                                                    <Plus size={18} strokeWidth={3} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {allMaterials.length === 0 && (
                                    <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">No materials found via API.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    )
}
