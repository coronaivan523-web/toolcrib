import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Check, X, Clock, User, Package, FileText, Search } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 text-red-600">
                    <h1>Something went wrong.</h1>
                    <details className="whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

function TicketsContent() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [materials, setMaterials] = useState([]) // For selection
    const [currentUser, setCurrentUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)

    // Search & Filter State
    const [searchDesc, setSearchDesc] = useState('')
    const [searchPart, setSearchPart] = useState('')
    const [filterProcess, setFilterProcess] = useState('all') // New Process State
    const [filterArea, setFilterArea] = useState('all')
    const [filterMachine, setFilterMachine] = useState('all')

    // New Ticket State (Cart)
    const [cartItems, setCartItems] = useState([]) // { material_id, quantity, material: { ... } }
    const [qtyInputs, setQtyInputs] = useState({}) // track input values for the search table: { [matId]: qty }

    // Job Details State (Missing definitions added)
    const [jobPlant, setJobPlant] = useState('')
    const [jobArea, setJobArea] = useState('')
    const [jobMachine, setJobMachine] = useState('')
    const [jobProcess, setJobProcess] = useState('')

    useEffect(() => {
        fetchUserAndTickets()
        fetchMaterials()
    }, [])

    const fetchUserAndTickets = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)

        if (user) {
            // Get full profile with RPC fallback
            let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

            if (error || !profile) {
                const { data: rpcProfile } = await supabase.rpc('get_my_profile').single()
                if (rpcProfile) profile = rpcProfile
            }

            setUserProfile(profile)
            const isAdminRole = profile?.role === 'admin' || profile?.role === 'supervisor'
            setIsAdmin(isAdminRole)

            // Fetch Tickets
            // Fetch Tickets
            let query = supabase.from('tickets')
                .select('*, items:ticket_items(*, material:materials(name, part_number)), requester:profiles!tickets_requester_id_fkey(email, full_name)')
                .order('created_at', { ascending: false })

            if (!isAdminRole) {
                // Filter by requester and allowed statuses
                query = query.eq('requester_id', user.id).in('status', ['pending', 'PENDIENTE'])
            }

            const { data, error: queryError } = await query
            if (data) setTickets(data)
            if (queryError) {
                console.error("Error fetching tickets:", queryError)
                setError(queryError) // Show on screen
            }
        }
        setLoading(false)
    }


    const [editingItemIndex, setEditingItemIndex] = useState(null)

    const fetchMaterials = async () => {
        // Fetch extended fields for filtering and display
        // Try to fetch 'area' first, if empty/null, we might need to handle 'Area' fallback in logic, 
        // but typically the frontend should read what's available. 
        // We select both just in case, or rely on the fix applied previously to DB.
        const { data } = await supabase
            .from('materials')
            .select('*') // Added plant
            .eq('status', 'active')
            .order('name')

        if (data) setMaterials(data)
    }

    // Filter Logic
    // Filter Logic
    const hasActiveFilters = searchDesc || searchPart || filterProcess !== 'all' || filterArea !== 'all' || filterMachine !== 'all'

    const filteredMaterials = hasActiveFilters ? materials.filter(m => {
        const descMatch = !searchDesc || m.name?.toLowerCase().includes(searchDesc.toLowerCase())
        const partMatch = !searchPart || m.part_number?.toLowerCase().includes(searchPart.toLowerCase())
        // Handle Area/area ambiguity
        const mArea = m.area || m.Area || ''
        const processMatch = filterProcess === 'all' || (m.process || '') === filterProcess
        const areaMatch = filterArea === 'all' || mArea === filterArea
        const machineMatch = filterMachine === 'all' || (m.machine_asset || '') === filterMachine
        return descMatch && partMatch && processMatch && areaMatch && machineMatch
    }) : []

    // Unique options for Selects
    // Unique options for Selects (Independent to prevent "elimination" perception)
    const uniqueProcesses = [...new Set(materials.map(m => m.process).filter(Boolean))].sort()
    const uniqueAreas = [...new Set(materials.map(m => m.area || m.Area).filter(Boolean))].sort()
    const uniqueMachines = [...new Set(materials.map(m => m.machine_asset).filter(Boolean))].sort()

    const handleAddToCart = (material) => {
        // Check if there's an unconfirmed item in the cart
        const unconfirmedItem = cartItems.find(item => !item.confirmed)
        if (unconfirmedItem) {
            alert("Please fill in and confirm Job Details for the current pending item before adding another.")
            return
        }

        const qtyToOrder = parseInt(qtyInputs[material.id] || 1)
        if (qtyToOrder <= 0) return

        // Check if already in cart
        if (cartItems.some(item => item.material_id === material.id)) {
            alert("This item is already in your request list.")
            return
        }

        const newCart = [...cartItems, {
            material_id: material.id,
            quantity: qtyToOrder,
            material,
            confirmed: false,
            details: material.plant || material.area || material.machine_asset || material.process ? {
                plant: material.plant || '',
                area: material.area || material.Area || '',
                machine: material.machine_asset || '',
                process: material.process || ''
            } : null // Initialize with defaults if available
        }]

        setCartItems(newCart)

        // Auto-select the newly added item for editing
        const newIndex = newCart.length - 1;
        setEditingItemIndex(newIndex);

        // Pre-fill form with material defaults
        setJobPlant(material.plant || '')
        setJobArea(material.area || material.Area || '')
        setJobMachine(material.machine_asset || '')
        setJobProcess(material.process || '')

        // Reset input for that item
        setQtyInputs({ ...qtyInputs, [material.id]: '' })
    }

    const handleRemoveFromCart = (index) => {
        const itemToRemove = cartItems[index]
        const newCart = [...cartItems]
        newCart.splice(index, 1)
        setCartItems(newCart)

        // If we removed the item currently being edited (unconfirmed), clear the form
        if (!itemToRemove.confirmed) {
            setJobArea('')
            setJobMachine('')
            setJobProcess('')
            setJobPlant('')
        }
    }



    const handleConfirmDetails = () => {
        if (editingItemIndex === null) return;

        if (!jobPlant || !jobArea || !jobMachine || !jobProcess) {
            alert("Please fill in all Job Details (Factory, Area, Machine, Process) to confirm this item.")
            return
        }

        const newCart = [...cartItems]
        newCart[editingItemIndex] = {
            ...newCart[editingItemIndex],
            confirmed: true,
            details: {
                plant: jobPlant,
                area: jobArea,
                machine: jobMachine,
                process: jobProcess
            }
        }
        setCartItems(newCart)

        // Find next unconfirmed item
        const nextUnconfirmed = newCart.findIndex((item, idx) => !item.confirmed && idx !== editingItemIndex)
        if (nextUnconfirmed !== -1) {
            setEditingItemIndex(nextUnconfirmed)
            const item = newCart[nextUnconfirmed]
            setJobPlant(item.details?.plant || '')
            setJobArea(item.details?.area || '')
            setJobMachine(item.details?.machine || '')
            setJobProcess(item.details?.process || '')
        } else {
            setEditingItemIndex(null) // All confirmed
            setJobPlant('')
            setJobArea('')
            setJobMachine('')
            setJobProcess('')
        }
    }

    const handleCreateTicket = async () => {
        if (cartItems.length === 0) {
            alert("Please add items to your request.")
            return
        }



        try {
            // Create Ticket Container (Header)
            const { data: ticket, error: ticketError } = await supabase.from('tickets').insert([{
                requester_id: currentUser.id,
                status: 'pending'
            }]).select().single()

            if (ticketError) throw ticketError

            // Map items using their INDIVIDUAL Job Details
            const items = cartItems.map(item => ({
                ticket_id: ticket.id,
                material_id: item.material_id,
                quantity_requested: item.quantity,
                plant: item.details.plant,
                area: item.details.area,
                line_machine: item.details.machine,
                process: item.details.process
            }))

            const { error: itemsError } = await supabase.from('ticket_items').insert(items)
            if (itemsError) throw itemsError

            setIsCreateModalOpen(false)
            setCartItems([])
            // Clear Job Details
            setJobPlant('')
            setJobArea('')
            setJobMachine('')
            setJobProcess('')

            fetchUserAndTickets()
            alert("Ticket created successfully!")

        } catch (error) {
            console.error(error)
            alert("Error creating ticket: " + error.message)
        }
    }

    const handleCloseTicket = async (ticketId, items) => {
        if (!isAdmin) return

        // 1. Deduct Stock
        for (const item of items) {
            const { data: mat } = await supabase.from('materials').select('current_stock').eq('id', item.material_id).single()
            const current = mat?.current_stock || 0
            const newStock = current - item.quantity_requested

            await supabase.from('materials').update({ current_stock: newStock }).eq('id', item.material_id)
            await supabase.from('ticket_items').update({ quantity_fulfilled: item.quantity_requested }).eq('id', item.id)
        }

        // 2. Update Ticket
        await supabase.from('tickets').update({ status: 'ENTREGADO', assigned_to: currentUser.id }).eq('id', ticketId)
        fetchUserAndTickets()
    }

    const handleCloseModal = () => {
        if (cartItems.length > 0) {
            if (!window.confirm("All entered information will be lost. Do you wish to proceed?")) {
                return
            }
        }
        setIsCreateModalOpen(false)
        setCartItems([])
        setSearchDesc('')
        setSearchPart('')
        setFilterProcess('all')
        setFilterArea('all')
        setFilterMachine('all')
        setJobPlant('')
        setJobArea('')
        setJobMachine('')
        setJobProcess('')
    }

    return (

        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

            <PageHeader
                title="Tickets"
                subtitle="Manage material requests and approvals."
                user={currentUser}
                profile={userProfile}
                bgColor="#164e63" // Cyan-900
            />

            {/* Toolbar */}
            <div className="bg-primary-900 px-8 pb-3 pt-0 flex justify-end border-t border-primary-800/50 shadow-md z-20">
                <button
                    onClick={() => {
                        setIsCreateModalOpen(true)
                        // Reset filters when opening
                        setSearchDesc('')
                        setSearchPart('')
                        setFilterProcess('all')
                        setFilterArea('all')
                        setFilterMachine('all')
                    }}
                    className="bg-white text-primary-900 px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg hover:bg-slate-50 transition-all text-sm transform hover:-translate-y-0.5"
                >
                    <Plus size={16} strokeWidth={3} />
                    New Request
                </button>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="grid gap-4 max-w-5xl mx-auto">
                    {/* Error Debug Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                            <h4 className="font-bold flex items-center gap-2"><X size={16} /> Error loading tickets:</h4>
                            <pre className="text-xs overflow-auto mt-2">{JSON.stringify(error, null, 2)}</pre>
                        </div>
                    )}

                    {loading ? <p className="text-center text-slate-500 py-10">Loading tickets...</p> : tickets.map(ticket => (
                        <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">

                            <div className="md:w-1/4 border-r border-slate-100 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-full ${ticket.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                        {ticket.status === 'PENDIENTE' ? <Clock size={20} /> : <Check size={20} />}
                                    </div>
                                    <span className="font-bold text-slate-800">{ticket.status}</span>
                                </div>
                                <p className="text-lg text-slate-700 font-bold mb-0">#{ticket.folio || '---'}</p>
                                <p className="text-xs text-slate-500 font-mono mb-1">ID: {String(ticket.id || '').slice(0, 8) || 'Unknown'}</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs text-slate-500 overflow-hidden">
                                        {ticket.requester?.avatar_url ? <img src={ticket.requester.avatar_url} className="w-full h-full object-cover" /> : (ticket.requester?.email?.[0] || '?')}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{ticket.requester?.full_name || ticket.requester?.email || 'Unknown User'}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'No date'}
                                </p>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Requested Items</h4>
                                <div className="space-y-2">
                                    {ticket.items?.map(item => (
                                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-1.5 rounded-md border border-slate-200 text-slate-500">
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 text-sm">{item.material?.name || 'Unknown Item'}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.material?.part_number}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-primary-900 text-lg">{item.quantity_requested} <span className="text-xs font-normal text-slate-500">qty</span></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isAdmin && ticket.status === 'PENDIENTE' && (
                                <div className="md:w-40 flex flex-col justify-center gap-2 pl-4 border-l border-slate-100">
                                    <button onClick={() => handleCloseTicket(ticket.id, ticket.items)} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm"><Check size={16} /> Approve</button>
                                    <button className="w-full bg-white border border-slate-200 text-slate-600 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"><X size={16} /> Reject</button>
                                </div>
                            )}
                        </div>
                    ))}
                    {tickets.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
                            <p className="text-slate-500">Create a new request to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* NEW Redesigned Modal - Full Screen / Large */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center shadow-md shrink-0">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2">
                                    <Package className="text-primary-300" />
                                    Tool Crib Material Request
                                </h3>
                            </div>
                            <button onClick={handleCloseModal} className="text-primary-200 hover:text-white transition-colors">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Side: Product Selection & Search */}
                            <div className="w-2/3 flex flex-col border-r border-slate-200 bg-slate-50/50">
                                {/* Search Bar */}
                                <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                                    <h4 className="font-medium text-slate-800 text-lg flex items-center gap-2 mb-4 tracking-tight">
                                        <Search size={20} /> Search Materials
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex gap-4">
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-sm w-24 text-right">Description:</label>
                                                <input
                                                    type="text"
                                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light"
                                                    value={searchDesc}
                                                    onChange={e => {
                                                        if (cartItems.some(i => !i.confirmed)) {
                                                            alert("Please complete the current item details or remove it to perform a new search.")
                                                            return
                                                        }
                                                        setSearchDesc(e.target.value)
                                                        // Allow combining filters
                                                    }}
                                                />
                                            </div>
                                            <div className="w-80 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-sm w-24 text-right leading-tight">Part Number:</label>
                                                <input
                                                    type="text"
                                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light"
                                                    value={searchPart}
                                                    onChange={e => {
                                                        if (cartItems.some(i => !i.confirmed)) {
                                                            alert("Please complete the current item details or remove it to perform a new search.")
                                                            return
                                                        }
                                                        setSearchPart(e.target.value)
                                                        // Allow combining filters
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-sm w-24 text-right">Process:</label>
                                                <select
                                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                    value={filterProcess}
                                                    onChange={e => {
                                                        if (cartItems.some(i => !i.confirmed)) {
                                                            alert("Please complete the current item details or remove it to perform a new search.")
                                                            return
                                                        }
                                                        setFilterProcess(e.target.value)
                                                    }}
                                                >
                                                    <option value="all">- Select -</option>
                                                    {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-sm w-24 text-right">Area:</label>
                                                <select
                                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                    value={filterArea}
                                                    onChange={e => {
                                                        if (cartItems.some(i => !i.confirmed)) {
                                                            alert("Please complete the current item details or remove it to perform a new search.")
                                                            return
                                                        }
                                                        setFilterArea(e.target.value)
                                                    }}
                                                >
                                                    <option value="all">- Select -</option>
                                                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-sm w-24 text-right">Machine:</label>
                                                <select
                                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                    value={filterMachine}
                                                    onChange={e => {
                                                        if (cartItems.some(i => !i.confirmed)) {
                                                            alert("Please complete the current item details or remove it to perform a new search.")
                                                            return
                                                        }
                                                        setFilterMachine(e.target.value)
                                                    }}
                                                >
                                                    <option value="all">- Select -</option>
                                                    {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={() => {
                                                setSearchDesc('')
                                                setSearchPart('')
                                                setFilterProcess('all')
                                                setFilterArea('all')
                                                setFilterMachine('all')
                                            }}
                                            className="text-xs text-slate-500 hover:text-red-500 underline flex items-center gap-1 transition-colors"
                                        >
                                            <X size={12} /> Clear Filters
                                        </button>
                                    </div>
                                </div>

                                {/* Table Results */}
                                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                    <table className="w-full border-separate border-spacing-0">
                                        <thead>
                                            <tr>
                                                <th className="p-3 border-b border-primary-200 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-left text-xs font-bold text-primary-800 uppercase tracking-wider rounded-tl-lg">Part #</th>
                                                <th className="p-3 border-b border-primary-200 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Description</th>
                                                <th className="p-3 border-b border-primary-200 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Process</th>
                                                <th className="p-3 border-b border-primary-200 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Area</th>
                                                <th className="p-3 border-b border-primary-200 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Machine</th>
                                                <th className="p-3 border-b border-primary-200 text-center sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-xs font-bold text-primary-800 uppercase tracking-wider">Stock</th>
                                                <th className="p-3 border-b border-primary-200 w-24 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Qty</th>
                                                <th className="p-3 border-b border-primary-200 w-24 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-center text-xs font-bold text-primary-800 uppercase tracking-wider rounded-tr-lg">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMaterials.length > 0 ? (
                                                filteredMaterials.map(material => (
                                                    <tr key={material.id} className="hover:bg-blue-50/50 transition-colors group">
                                                        <td className="p-3 border-b border-slate-100 font-mono text-sm text-slate-600 bg-white group-hover:bg-blue-50/50">{material.part_number}</td>
                                                        <td className="p-3 border-b border-slate-100 text-sm text-slate-500 bg-white group-hover:bg-blue-50/50">{material.name}</td>
                                                        <td className="p-3 border-b border-slate-100 text-sm text-slate-500 bg-white group-hover:bg-blue-50/50">{material.process}</td>
                                                        <td className="p-3 border-b border-slate-100 text-sm text-slate-500 bg-white group-hover:bg-blue-50/50">{material.area || material.Area}</td>
                                                        <td className="p-3 border-b border-slate-100 text-sm text-slate-500 bg-white group-hover:bg-blue-50/50">{material.machine_asset}</td>
                                                        <td className={`p-3 border-b border-slate-100 text-center font-bold text-sm bg-white group-hover:bg-blue-50/50 ${material.current_stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {material.current_stock}
                                                        </td>
                                                        <td className="p-3 border-b border-slate-100 bg-white group-hover:bg-blue-50/50">
                                                            <input
                                                                type="number"
                                                                className="w-16 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                                                min="1"
                                                                value={qtyInputs[material.id] || ''}
                                                                onChange={e => setQtyInputs({ ...qtyInputs, [material.id]: e.target.value })}
                                                                placeholder="1"
                                                            />
                                                        </td>
                                                        <td className="p-3 border-b border-slate-100 text-center bg-white group-hover:bg-blue-50/50">
                                                            <button
                                                                onClick={() => handleAddToCart(material)}
                                                                disabled={material.current_stock <= 0}
                                                                className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colspan="8" className="p-8 text-center text-slate-400">
                                                        <p className="font-medium">No materials found matching your filters.</p>
                                                        <button
                                                            onClick={() => {
                                                                setSearchDesc('')
                                                                setSearchPart('')
                                                                setFilterProcess('all')
                                                                setFilterArea('all')
                                                                setFilterMachine('all')
                                                            }}
                                                            className="text-primary-600 hover:text-primary-800 text-sm font-bold mt-2 underline"
                                                        >
                                                            Clear Filters
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right Side: Cart & Details */}
                            <div className="w-1/3 flex flex-col bg-slate-50 border-l border-slate-200">
                                <div className="p-4 bg-white shadow-sm z-10 flex justify-between items-center">
                                    <h4 className="font-medium text-slate-800 text-lg flex items-center gap-2 tracking-tight">
                                        <FileText size={18} className="text-primary-600" />
                                        Order Request
                                    </h4>
                                    <button
                                        onClick={handleCreateTicket}
                                        disabled={cartItems.length === 0 || cartItems.some(i => !i.confirmed)}
                                        className={`px-4 py-1.5 rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${cartItems.length === 0 || cartItems.some(i => !i.confirmed)
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5'
                                            }`}
                                    >
                                        <Check size={14} /> Submit
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto p-4 space-y-3">
                                    {cartItems.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                            <Package size={64} className="mb-4 text-slate-200" />
                                            <p>Your request list is empty.</p>
                                        </div>
                                    ) : (
                                        cartItems.map((item, idx) => {
                                            const isSelected = editingItemIndex === idx;
                                            const isPending = !item.confirmed;
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setEditingItemIndex(idx);
                                                        // Load item details into form
                                                        setJobPlant(item.details?.plant || '');
                                                        setJobArea(item.details?.area || '');
                                                        setJobMachine(item.details?.machine || '');
                                                        setJobProcess(item.details?.process || '');
                                                    }}
                                                    className={`p-3 rounded-lg border cursor-pointer relative group transition-all ${isSelected
                                                        ? 'ring-2 ring-primary-500 border-primary-500 shadow-md z-10'
                                                        : isPending
                                                            ? 'bg-yellow-50 border-yellow-400'
                                                            : 'bg-white border-slate-200 hover:border-primary-300'
                                                        }`}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFromCart(idx);
                                                        }}
                                                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>

                                                    <div className="flex items-start justify-between pr-6">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h5 className="font-bold text-slate-900 text-sm leading-tight">{item.material.part_number}</h5>
                                                                {isPending && (
                                                                    <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-800 text-[10px] font-bold uppercase rounded tracking-wide">
                                                                        PENDING DETAILS
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-600 font-medium">{item.material.name}</p>
                                                        </div>
                                                        <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-xs font-bold ring-1 ring-primary-100 whitespace-nowrap ml-2">
                                                            {item.quantity} QTY
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Footer: JOB DETAILS Form + Submit */}
                                <div className="p-4 bg-white border-t border-slate-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JOB DETAILS</h5>
                                        {editingItemIndex !== null && cartItems[editingItemIndex] && (
                                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                FOR: {cartItems[editingItemIndex].material.part_number}
                                            </span>
                                        )}
                                    </div>

                                    <div className={`grid grid-cols-2 gap-3 mb-4 transition-opacity ${editingItemIndex === null ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Factory</label>
                                            <select className="w-full bg-slate-50 text-xs p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none" value={jobPlant} onChange={e => setJobPlant(e.target.value)}>
                                                <option value="">- Select -</option>
                                                <option value="Planta 1">Planta 1</option>
                                                <option value="Planta 2">Planta 2</option>
                                                <option value="Planta 3">Planta 3</option>
                                                <option value="Planta 5">Planta 5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Area</label>
                                            <input className="w-full bg-slate-50 text-xs p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none" value={jobArea} onChange={e => setJobArea(e.target.value)} placeholder="e.g. Assembly" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Machine</label>
                                            <input className="w-full bg-slate-50 text-xs p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none" value={jobMachine} onChange={e => setJobMachine(e.target.value)} placeholder="e.g. CNC-01" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Process</label>
                                            <select className="w-full bg-slate-50 text-xs p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none" value={jobProcess} onChange={e => setJobProcess(e.target.value)}>
                                                <option value="">- Select -</option>
                                                {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {editingItemIndex !== null ? (
                                        <button
                                            onClick={handleConfirmDetails}
                                            className="w-full py-2.5 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 text-sm bg-green-600 hover:bg-green-700 transform hover:-translate-y-0.5 transition-all"
                                        >
                                            Confirm Details & Continue
                                        </button>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center mb-3 pt-2 border-t border-slate-100">
                                                <span className="text-slate-500 font-medium text-xs">Total Items</span>
                                                <span className="text-xl font-bold text-slate-800">{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                                            </div>
                                            <button
                                                onClick={handleCreateTicket}
                                                disabled={cartItems.length === 0 || cartItems.some(i => !i.confirmed)}
                                                className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 text-sm ${cartItems.length === 0 || cartItems.some(i => !i.confirmed)
                                                    ? 'bg-slate-300 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700 transform hover:-translate-y-0.5 transition-all'
                                                    }`}
                                            >
                                                <Check size={18} />
                                                Submit Request
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function Tickets() {
    return (
        <ErrorBoundary>
            <TicketsContent />
        </ErrorBoundary>
    )
}

