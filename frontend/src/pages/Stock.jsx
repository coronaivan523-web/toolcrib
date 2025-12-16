import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, RotateCw, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'

export default function Stock() {
    const [materials, setMaterials] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
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

    const filteredMaterials = materials.filter(m =>
        m.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
                <div className="relative max-w-md w-full mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search by Part #, Name or Location..."
                        className="w-full pl-9 pr-4 py-1.5 bg-primary-800/50 border-transparent focus:bg-primary-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-400 rounded-lg text-sm text-white placeholder-primary-400 transition-all outline-none font-medium shadow-inner"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchStock}
                    className="text-primary-300 hover:text-white transition-colors"
                    title="Refresh Data"
                >
                    <RotateCw size={18} />
                </button>
            </div>

            {/* Content - Full Width Table View */}
            <div className="flex-1 overflow-auto bg-white flex flex-col">
                <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-medium tracking-wider border-b border-slate-300 sticky top-0 z-40 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 border-r border-slate-200 w-36 min-w-[9rem] max-w-[9rem] sticky left-0 z-50 bg-slate-100">Part number</th>
                            <th className="px-4 py-3 border-r border-slate-200 w-[400px] min-w-[400px] max-w-[400px] sticky left-36 z-50 bg-slate-100">Name</th>
                            <th className="px-4 py-3 text-center border-r border-slate-200 sticky left-[calc(9rem+400px)] z-50 bg-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Stock</th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">Max</th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">Min</th>
                            <th className="px-4 py-3 border-r border-slate-200">Location</th>
                            <th className="px-4 py-3 border-r border-slate-200">Category</th>
                            <th className="px-4 py-3 border-r border-slate-200">Type</th>
                            <th className="px-4 py-3 border-r border-slate-200">Factory</th>
                            <th className="px-4 py-3 border-r border-slate-200">Process</th>
                            <th className="px-4 py-3 border-r border-slate-200">Area</th>
                            <th className="px-4 py-3 border-r border-slate-200">Machine</th>
                            <th className="px-4 py-3 border-r border-slate-200">Cost center</th>
                            <th className="px-4 py-3 text-right border-r border-slate-200">Cost</th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">Currency</th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">Origin</th>
                            <th className="px-4 py-3 text-center border-r border-slate-200">Class</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center border-l border-slate-200">Req</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="14" className="px-4 py-8 text-center text-slate-400">Loading inventory data...</td>
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
