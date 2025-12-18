import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, RotateCw, AlertTriangle, ClipboardList, ListFilter } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'

const FilterInput = ({ value, onChange, placeholder = "Filter" }) => (
    <input
        type="text"
        placeholder={placeholder}
        className="w-full mt-1 px-1 py-0.5 text-[10px] border border-slate-300 rounded bg-white font-normal focus:outline-none focus:border-blue-400 text-slate-600 placeholder:text-slate-300"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
    />
)

export default function Stock() {
    const [materials, setMaterials] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filters, setFilters] = useState({})
    const [showLowStock, setShowLowStock] = useState(false)
    const [showRequisitionOnly, setShowRequisitionOnly] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)

    useEffect(() => {
        fetchStock()
        fetchUser()
    }, [])

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        if (user) {
            // Try standard fetch
            let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

            // Fallback to RPC if RLS blocks standard fetch
            if (error || !profile) {
                const { data: rpcProfile } = await supabase.rpc('get_my_profile').single()
                if (rpcProfile) profile = rpcProfile
            }

            if (profile) setUserProfile(profile)
        }
    }

    const fetchStock = async () => {
        setLoading(true)
        // Select all requested columns
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('status', 'active')
            .order('part_number')

        if (data) setMaterials(data)
        if (error) console.error("Error fetching stock:", error)
        setLoading(false)
    }

    const filteredMaterials = materials.filter(m => {
        const search = searchTerm.toLowerCase()

        // Low Stock Check
        if (showLowStock) {
            const current = Number(m.current_stock || 0)
            const min = Number(m.min_stock || 0)
            if (current > min) return false
        }

        // Requisition Only Check
        if (showRequisitionOnly && !m.has_requisition) return false

        const matchesGlobal = (
            m.part_number?.toLowerCase().includes(search) ||
            m.name?.toLowerCase().includes(search) ||
            m.location?.toLowerCase().includes(search) ||
            m.current_stock?.toString().includes(search) ||
            m.max_stock?.toString().includes(search) ||
            m.min_stock?.toString().includes(search) ||
            m.category?.toLowerCase().includes(search) ||
            m.material_type?.toLowerCase().includes(search) ||
            m.plant?.toLowerCase().includes(search) ||
            m.process?.toLowerCase().includes(search) ||
            (m.area || m.Area)?.toLowerCase().includes(search) ||
            m.machine_asset?.toLowerCase().includes(search) ||
            m.cost_center?.toLowerCase().includes(search) ||
            m.supplier?.toLowerCase().includes(search) ||
            m.unit_cost?.toString().includes(search) ||
            m.currency?.toLowerCase().includes(search) ||
            m.origin_country?.toLowerCase().includes(search) ||
            m.abc_class?.toLowerCase().includes(search)
        )

        const matchesFilters = Object.entries(filters).every(([key, value]) => {
            if (!value) return true
            let itemValue = m[key]
            if (key === 'area') itemValue = m.area || m.Area // Handle area discrepancy
            return itemValue?.toString().toLowerCase().includes(value.toLowerCase())
        })

        return matchesGlobal && matchesFilters
    })

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }



    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <PageHeader
                title="Inventory"
                subtitle="Live view of current stock levels and locations."
                user={currentUser}
                profile={userProfile}
                bgColor="#334155" // Slate-800
            />

            {/* Toolbar */}
            <div className="bg-primary-900 px-8 pb-3 pt-0 flex justify-between items-center border-t border-primary-800/50 shadow-md z-20">
                <div className="flex items-center gap-3 w-full max-w-md mt-1">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search all columns..."
                            className="w-full pl-9 pr-4 py-1.5 bg-primary-800/50 border-transparent focus:bg-primary-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-400 rounded-lg text-sm text-white placeholder-primary-400 transition-all outline-none font-medium shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-800/40 border border-primary-700/50 rounded-lg shadow-sm backdrop-blur-sm">
                        <div className="p-1.5 rounded-md bg-primary-500/20 text-primary-200">
                            <ListFilter size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-primary-400 tracking-wider leading-none mb-0.5">Visible</span>
                            <span className="text-sm font-bold text-white font-mono leading-none">{filteredMaterials.length}</span>
                        </div>
                    </div>

                    <button
                        onClick={fetchStock}
                        className="text-primary-300 hover:text-white transition-colors p-2 hover:bg-primary-800 rounded-lg"
                        title="Refresh Data"
                    >
                        <RotateCw size={20} />
                    </button>
                </div>
            </div>

            {/* Content - Full Width Table View */}
            <div className="flex-1 overflow-auto bg-white flex flex-col">
                <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-medium tracking-wider border-b border-slate-300 sticky top-0 z-40 shadow-sm">
                        <tr>
                            <th className="px-4 py-2 border-r border-slate-200 w-36 min-w-[9rem] max-w-[9rem] sticky left-0 z-50 bg-slate-100">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Part number</span>
                                    <FilterInput value={filters.part_number} onChange={(val) => handleFilterChange('part_number', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200 w-[400px] min-w-[400px] max-w-[400px] sticky left-36 z-50 bg-slate-100">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Name</span>
                                    <FilterInput value={filters.name} onChange={(val) => handleFilterChange('name', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center border-r border-slate-200 sticky left-[calc(9rem+400px)] z-50 bg-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Stock</span>
                                    <button
                                        onClick={() => setShowLowStock(!showLowStock)}
                                        className={clsx(
                                            "p-1 rounded transition-colors",
                                            showLowStock ? "bg-red-100 text-red-600" : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                        )}
                                        title={showLowStock ? "Show All Stock" : "Show Low Stock Only"}
                                    >
                                        <AlertTriangle size={14} />
                                    </button>
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">
                                Max
                            </th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">
                                Min
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Location</span>
                                    <FilterInput value={filters.location} onChange={(val) => handleFilterChange('location', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Category</span>
                                    <FilterInput value={filters.category} onChange={(val) => handleFilterChange('category', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Type</span>
                                    <FilterInput value={filters.material_type} onChange={(val) => handleFilterChange('material_type', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Factory</span>
                                    <FilterInput value={filters.plant} onChange={(val) => handleFilterChange('plant', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Process</span>
                                    <FilterInput value={filters.process} onChange={(val) => handleFilterChange('process', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Area</span>
                                    <FilterInput value={filters.area} onChange={(val) => handleFilterChange('area', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Machine</span>
                                    <FilterInput value={filters.machine_asset} onChange={(val) => handleFilterChange('machine_asset', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Cost center</span>
                                    <FilterInput value={filters.cost_center} onChange={(val) => handleFilterChange('cost_center', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Supplier</span>
                                    <FilterInput value={filters.supplier} onChange={(val) => handleFilterChange('supplier', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Cost</span>
                                    <FilterInput value={filters.unit_cost} onChange={(val) => handleFilterChange('unit_cost', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 text-center border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Currency</span>
                                    <FilterInput value={filters.currency} onChange={(val) => handleFilterChange('currency', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 text-center border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Origin</span>
                                    <FilterInput value={filters.origin_country} onChange={(val) => handleFilterChange('origin_country', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-2 text-center border-r border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Class</span>
                                    <FilterInput value={filters.abc_class} onChange={(val) => handleFilterChange('abc_class', val)} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center border-l border-slate-200">
                                <div className="flex flex-col items-center justify-center w-full gap-1">
                                    <span>Req</span>
                                    <button
                                        onClick={() => setShowRequisitionOnly(!showRequisitionOnly)}
                                        className={clsx(
                                            "p-1 rounded transition-colors",
                                            showRequisitionOnly ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                        )}
                                        title={showRequisitionOnly ? "Show All" : "Show With Requisition Only"}
                                    >
                                        <ClipboardList size={14} />
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="15" className="px-4 py-8 text-center text-slate-400">Loading inventory data...</td>
                            </tr>
                        ) : filteredMaterials.map((item, idx) => {
                            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
                            return (
                                <tr key={item.id} className={clsx(
                                    "hover:bg-blue-50/50 transition-colors",
                                    rowBg
                                )}>
                                    <td className={clsx("px-4 py-2 font-mono font-bold text-slate-700 border-r border-slate-100 truncate sticky left-0 z-20 w-36 min-w-[9rem] max-w-[9rem]", rowBg)}>{item.part_number}</td>
                                    <td className={clsx("px-4 py-2 font-medium truncate border-r border-slate-100 sticky left-36 z-20 w-[400px] min-w-[400px] max-w-[400px]", rowBg)} title={item.name}>{item.name}</td>

                                    <td className={clsx("px-4 py-2 text-center border-r border-slate-100 sticky left-[calc(9rem+400px)] z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]", rowBg)}>
                                        <div className={clsx(
                                            "inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold min-w-[3rem]",
                                            item.current_stock <= (item.min_stock || 0) ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                                        )}>
                                            {item.current_stock}
                                            {item.current_stock <= (item.min_stock || 0) && <AlertTriangle size={10} className="ml-1" />}
                                        </div>
                                    </td>

                                    <td className="px-4 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{item.max_stock || '-'}</td>
                                    <td className="px-4 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{item.min_stock || '-'}</td>

                                    <td className="px-4 py-2 border-r border-slate-100">
                                        {item.location ? (
                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-mono text-[10px]">
                                                {item.location}
                                            </span>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>

                                    <td className="px-4 py-2 border-r border-slate-100">{item.category || '-'}</td>
                                    <td className="px-4 py-2 text-slate-500 border-r border-slate-100">{item.material_type || '-'}</td>
                                    <td className="px-4 py-2 border-r border-slate-100">{item.plant || '-'}</td>
                                    <td className="px-4 py-2 border-r border-slate-100">{item.process || '-'}</td>
                                    <td className="px-4 py-2 border-r border-slate-100">{item.area || item.Area || '-'}</td>
                                    <td className="px-4 py-2 text-slate-500 border-r border-slate-100">{item.machine_asset || '-'}</td>
                                    <td className="px-4 py-2 text-slate-500 border-r border-slate-100">{item.cost_center || '-'}</td>
                                    <td className="px-4 py-2 text-slate-500 border-r border-slate-100">{item.supplier || '-'}</td>
                                    <td className="px-4 py-2 text-right font-mono text-slate-600 border-r border-slate-100">
                                        ${Number(item.unit_cost || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-500 border-r border-slate-100">{item.currency || '-'}</td>
                                    <td className="px-4 py-2 text-center border-r border-slate-100">{item.origin_country || '-'}</td>
                                    <td className="px-4 py-2 text-center font-bold border-r border-slate-100">{item.abc_class || '-'}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                                        Active
                                    </td>
                                    <td className="px-4 py-2 text-center border-l border-slate-100">
                                        {item.has_requisition ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px]">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!loading && filteredMaterials.length === 0 && (
                    <div className="p-8 text-center text-slate-400">No materials found.</div>
                )}
            </div>
        </div>
    )
}
