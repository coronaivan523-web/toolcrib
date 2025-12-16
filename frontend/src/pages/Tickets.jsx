import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Check, X, Clock, User, Package, FileText, Search, Eye, AlertCircle, Info } from 'lucide-react'
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

    // Visual Verification State
    const [previewPartNumber, setPreviewPartNumber] = useState('')
    const [previewImage, setPreviewImage] = useState(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

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

    // Custom UI Notification & Confirmation States
    const [notification, setNotification] = useState(null) // { type: 'error'|'success'|'info', message: '' }
    const [showExitConfirm, setShowExitConfirm] = useState(false)

    // Helper to show notifications
    const showNotification = (message, type = 'error') => {
        setNotification({ message, type })
        // Auto-clear success/info messages, keep errors until fixed or dismissed
        if (type !== 'error') {
            setTimeout(() => setNotification(null), 4000)
        }
    }

    const [selectedTicketItem, setSelectedTicketItem] = useState(null)
    const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false)
    const [existingNotification, setExistingNotification] = useState(null)

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
                .select('*, items:ticket_items(*, material:materials(name, part_number, current_stock, min_stock)), requester:profiles!tickets_requester_id_fkey(email, full_name)')
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

    // Helper to block actions if there's a pending item
    const checkPendingAction = () => {
        if (cartItems.some(i => !i.confirmed)) {
            showNotification("Pending Action: Please complete the Job Details for the current item or remove it from the list.", 'error')
            return true
        }
        return false
    }

    const handleAddToCart = (material) => {
        // centralized check
        if (checkPendingAction()) return

        const qtyToOrder = parseInt(qtyInputs[material.id] || 1)
        if (qtyToOrder <= 0) return

        // Check if already in cart
        if (cartItems.some(item => item.material_id === material.id)) {
            showNotification("Item Duplicate: This material is already in your request list.", 'error')
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
            showNotification("Missing Information: Please select all Job Details (Factory, Area, Machine, Process) to continue.", 'error')
            return
        }
        // Clear any errors on success
        setNotification(null)

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
            showNotification("Please add items to your request.", 'error')
            return
        }

        if (checkPendingAction()) return



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
            setNotification(null) // Clear any persistent errors

            fetchUserAndTickets()
            // Optional: User toast for success on main screen, but simpler here just to close

        } catch (error) {
            console.error(error)
            showNotification("Error creating ticket: " + error.message, 'error')
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
            // Trigger custom confirmation modal
            setShowExitConfirm(true)
            return
        }
        performCloseModal()
    }

    const performCloseModal = () => {
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
        setPreviewPartNumber('')
        setPreviewImage(null)
        setNotification(null)
        setShowExitConfirm(false)
    }

    const handleSearchPreview = () => {
        if (!previewPartNumber.trim()) {
            showNotification("Please enter a Part Number to verify.", 'error')
            return
        }

        const material = materials.find(m => m.part_number.toLowerCase() === previewPartNumber.toLowerCase())

        if (!material) {
            showNotification("Material not found with this Part Number.", 'error')
            return
        }

        if (!material.image_url) {
            showNotification("This material does not have an image available for verification.", 'error')
            return
        }

        let url = material.image_url
        if (!url.startsWith('http')) {
            url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${material.image_url}`
        }

        setPreviewImage(url)
        setIsPreviewOpen(true)
    }

    // Check for existing notification when modal opens
    useEffect(() => {
        // Reset state immediately to avoid flashing previous data
        setExistingNotification(null)

        const checkNotification = async () => {
            if (isRequirementModalOpen && selectedTicketItem) {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('material_id', selectedTicketItem.material?.id)
                    .eq('type', 'low_stock_alert')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (!error && data) {
                    setExistingNotification(data)
                }
            }
        }
        checkNotification()
    }, [isRequirementModalOpen, selectedTicketItem])

    const handleNotify = async () => {
        if (!selectedTicketItem) return

        try {
            const { data, error } = await supabase.from('notifications').insert([{
                sender_id: currentUser?.id, // Assuming currentUser is available
                recipient_role: 'supervisor', // Notification target
                type: 'low_stock_alert',
                message: `Low stock reported for ${selectedTicketItem.material?.name} (${selectedTicketItem.material?.part_number}). Requested Qty: ${selectedTicketItem.quantity_requested}`,
                material_id: selectedTicketItem.material?.id,
                status: 'unread'
            }]).select().single()

            if (error) throw error

            // Update local state to show "Sent" UI immediately
            setExistingNotification(data)

            // Show Success Modal
            setNotification({
                type: 'info',
                message: 'Notification sent successfully to Supervisor & Tool Room.'
            })
            // DO NOT Close modal automatically, let user see the status change

        } catch (error) {
            console.error('Error sending notification:', error)
            showNotification("Failed to send notification: " + error.message, 'error')
        }
    }

    const handlePartClick = (partNumber) => {
        setPreviewPartNumber(partNumber)
    }

    // Dashboard Metrics
    const pendingCount = tickets.filter(t => t.status === 'pending' || t.status === 'PENDIENTE').length
    const inProcessCount = tickets.filter(t => t.status === 'IN_PROCESS' || t.status === 'EN PROCESO').length
    const readyCount = tickets.filter(t => t.status === 'READY' || t.status === 'LISTO').length

    const headerStats = (
        <div className="flex items-center gap-4">
            {/* Pending Requests (Left) */}
            <div className="bg-amber-100/20 border border-amber-200/30 rounded-md px-3 py-1 flex items-center gap-2 backdrop-blur-sm">
                <div className="bg-amber-500 text-white p-1 rounded-full shadow-sm animate-pulse">
                    <AlertCircle size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-amber-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">Pending</span>
                    <span className="text-white font-bold text-base leading-none">{pendingCount}</span>
                </div>
            </div>

            {/* Status: In Process */}
            <div className="bg-blue-100/20 border border-blue-200/30 rounded-md px-3 py-1 flex items-center gap-2 backdrop-blur-sm">
                <div className="bg-blue-500 text-white p-1 rounded-full shadow-sm">
                    <Clock size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-blue-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">In Process</span>
                    <span className="text-white font-bold text-base leading-none">{inProcessCount}</span>
                </div>
            </div>

            {/* Status: Ready */}
            <div className="bg-green-100/20 border border-green-200/30 rounded-md px-3 py-1 flex items-center gap-2 backdrop-blur-sm">
                <div className="bg-green-500 text-white p-1 rounded-full shadow-sm">
                    <Check size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-green-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">Ready</span>
                    <span className="text-white font-bold text-base leading-none">{readyCount}</span>
                </div>
            </div>
        </div>
    )

    return (

        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

            <PageHeader
                title="Tickets"
                subtitle="Manage material requests and approvals."
                user={currentUser}
                profile={userProfile}
                bgColor="#164e63" // Cyan-900
            />

            {/* Toolbar - Stats & Actions */}
            <div className="bg-primary-900 px-8 py-2 flex items-center justify-between border-t border-primary-800/50 shadow-md z-20">
                <div className="flex-1">
                    {headerStats}
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setIsRequirementModalOpen(true)}
                        disabled={!selectedTicketItem}
                        className={`px-4 py-1.5 rounded-md flex items-center gap-2 font-bold transition-all text-sm border backdrop-blur-sm ${selectedTicketItem
                            ? 'bg-pink-500/20 border-pink-400/30 text-white shadow-lg shadow-pink-900/20 hover:bg-pink-500/30 ring-1 ring-pink-500/50'
                            : 'bg-slate-800/20 border-slate-700/30 text-slate-500 cursor-not-allowed opacity-40'
                            }`}
                    >
                        <FileText size={16} strokeWidth={selectedTicketItem ? 2.5 : 2} className={selectedTicketItem ? 'text-pink-300' : ''} />
                        {selectedTicketItem ? selectedTicketItem.material?.name : 'Requirement Status'}
                    </button>

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

                    {/* Implement Requirement Details Modal - Moved to correct scope */}
                    {isRequirementModalOpen && selectedTicketItem && (
                        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsRequirementModalOpen(false)}>
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/10 p-2 rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">Requirement Details</h3>
                                            <p className="text-primary-200 text-xs">Tracking & Approval Process</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsRequirementModalOpen(false)} className="text-primary-300 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {/* Item Header */}
                                    <div className="flex gap-4 items-start mb-6 pb-6 border-b border-slate-100">
                                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                            <Package size={32} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg mb-1">{selectedTicketItem.material?.name}</h4>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{selectedTicketItem.material?.part_number}</span>
                                                <span className="font-medium text-slate-700">Qty: {selectedTicketItem.quantity_requested}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conditional Logic: NO Requirement vs Requirement Exists */}
                                    {true ? ( // Mock "hasRequirement" = false for demo purposes (User wants "No Requirement" view)
                                        // NO REQUIREMENT FOUND View
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-3 text-amber-800 font-bold mb-2">
                                                <AlertCircle size={20} />
                                                <h4>No Requisition Found</h4>
                                            </div>
                                            <p className="text-sm text-amber-700 mb-4">
                                                This item has reached its low stock threshold, but no purchase requisition has been created yet.
                                            </p>

                                            {existingNotification ? (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col items-center animate-in fade-in duration-300">
                                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                                                        <Check size={24} strokeWidth={3} />
                                                    </div>
                                                    <h4 className="text-green-800 font-bold text-lg">Message Sent</h4>
                                                    <p className="text-green-700 text-sm mb-1">Tool Room & Supervisors notified.</p>
                                                    <p className="text-green-600 text-xs font-mono">
                                                        {new Date(existingNotification.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <button
                                                    className="w-full py-2.5 bg-white border border-amber-300 text-amber-800 font-bold rounded-lg shadow-sm hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                                                    onClick={handleNotify}
                                                >
                                                    <FileText size={16} /> Notify Supervisor & Tool Room
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        // REQUIREMENT EXISTS View (Placeholder)
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3 relative">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center border-2 border-green-50 z-10">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                    <div className="w-0.5 h-10 bg-slate-200 my-1"></div>
                                                </div>
                                                <div className="pt-1">
                                                    <p className="text-sm font-bold text-slate-800">Request Created</p>
                                                    <p className="text-xs text-slate-500">System Auto-log</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border-2 border-blue-50 z-10 animate-pulse">
                                                    <Clock size={14} strokeWidth={3} />
                                                </div>
                                                <div className="pt-1">
                                                    <p className="text-sm font-bold text-slate-800">Pending Approval</p>
                                                    <p className="text-xs text-slate-500">Waiting for supervisor review...</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => setIsRequirementModalOpen(false)}
                                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 shadow-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
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
                                    {ticket.items?.map(item => {
                                        const isLowStock = item.material && item.material.current_stock <= item.material.min_stock
                                        const isSelected = selectedTicketItem && selectedTicketItem.id === item.id

                                        return (
                                            <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${isLowStock
                                                ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500'
                                                : isSelected
                                                    ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-sm'
                                                    : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md border ${isLowStock
                                                        ? 'bg-red-100 border-red-200 text-red-500'
                                                        : isSelected
                                                            ? 'bg-blue-100 border-blue-200 text-blue-500'
                                                            : 'bg-white border-slate-200 text-slate-500'
                                                        }`}>
                                                        <Package size={16} />
                                                    </div>
                                                    <div>
                                                        <p
                                                            onClick={() => setSelectedTicketItem(isLowStock ? item : null)}
                                                            className={`font-bold text-sm ${isLowStock
                                                                ? 'text-red-700 cursor-pointer hover:underline'
                                                                : isSelected
                                                                    ? 'text-blue-700 cursor-pointer'
                                                                    : 'text-slate-700 cursor-default'
                                                                }`}
                                                        >
                                                            {item.material?.name || 'Unknown Item'}
                                                        </p>
                                                        <p className={`text-xs font-mono ${isLowStock ? 'text-red-500' : 'text-slate-500'}`}>{item.material?.part_number}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`block font-bold text-lg ${isLowStock ? 'text-red-700' : 'text-primary-900'}`}>{item.quantity_requested} <span className={`text-xs font-normal ${isLowStock ? 'text-red-500' : 'text-slate-500'}`}>qty</span></span>
                                                    {isLowStock && (
                                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mt-0.5">Low Stock</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
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
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>

                        {/* Confirmation Modal Overlay */}
                        {showExitConfirm && (
                            <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Unsaved Changes</h3>
                                    <p className="text-sm text-slate-600 mb-6">All entered information in your request list will be lost. Do you wish to proceed?</p>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowExitConfirm(false)}
                                            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={performCloseModal}
                                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                                        >
                                            Yes, Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Custom Notification Modal (Centered) */}
                        {notification && (
                            <div className="absolute inset-0 z-[70] bg-black/40 flex items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setNotification(null)}>
                                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 transform scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                    <div className={`px-6 py-4 flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-50' : 'bg-blue-50'}`}>
                                        <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {notification.type === 'error' ? <AlertCircle size={24} /> : <Info size={24} />}
                                        </div>
                                        <h3 className={`font-bold text-lg ${notification.type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
                                            {notification.type === 'error' ? 'Attention Needed' : 'Information'}
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-slate-600 text-sm font-medium leading-relaxed">
                                            {notification.message}
                                        </p>
                                    </div>
                                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => setNotification(null)}
                                            className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-900 transition-transform active:scale-95 shadow-md flex items-center gap-2"
                                        >
                                            <Check size={16} /> OK
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}



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
                                {/* Visual Verification Block - NEW */}
                                <div className="p-2 bg-blue-50/50 border-b border-blue-100 shadow-sm z-10">
                                    <h4 className="font-bold text-blue-800 text-xs flex items-center gap-2 mb-1 tracking-tight uppercase">
                                        <Eye size={14} /> Visual Verification
                                    </h4>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 border border-blue-200 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-mono"
                                                    placeholder="Click part # ..."
                                                    value={previewPartNumber}
                                                    onChange={(e) => setPreviewPartNumber(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchPreview()}
                                                />
                                                <button
                                                    onClick={handleSearchPreview}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded-md font-bold text-[10px] shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1 uppercase tracking-wide"
                                                >
                                                    <Search size={12} /> Verify
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="p-2 bg-white border-b border-slate-200 shadow-sm z-10">
                                    <h4 className="font-medium text-slate-800 text-sm flex items-center gap-2 mb-1 tracking-tight">
                                        <Search size={16} /> Search Materials
                                    </h4>
                                    <div className="space-y-1">
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-xs w-20 text-right">Description:</label>
                                                <input
                                                    type="text"
                                                    className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light"
                                                    value={searchDesc}
                                                    onChange={e => {
                                                        if (checkPendingAction()) return
                                                        setSearchDesc(e.target.value)
                                                        // Allow combining filters
                                                    }}
                                                />
                                            </div>
                                            <div className="w-64 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-xs w-20 text-right leading-tight">Part Number:</label>
                                                <input
                                                    type="text"
                                                    className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light"
                                                    value={searchPart}
                                                    onChange={e => {
                                                        if (checkPendingAction()) return
                                                        setSearchPart(e.target.value)
                                                        // Allow combining filters
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-xs w-20 text-right">Process:</label>
                                                <select
                                                    className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                    value={filterProcess}
                                                    onChange={e => {
                                                        if (checkPendingAction()) return
                                                        setFilterProcess(e.target.value)
                                                    }}
                                                >
                                                    <option value="all">- Select -</option>
                                                    {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-xs w-20 text-right">Area:</label>
                                                <select
                                                    className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                    value={filterArea}
                                                    onChange={e => {
                                                        if (checkPendingAction()) return
                                                        setFilterArea(e.target.value)
                                                    }}
                                                >
                                                    <option value="all">- Select -</option>
                                                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1 flex items-center gap-2">
                                                <label className="font-normal text-slate-600 text-xs w-20 text-right">Machine:</label>
                                                <select
                                                    className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                    value={filterMachine}
                                                    onChange={e => {
                                                        if (checkPendingAction()) return
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
                                                if (checkPendingAction()) return
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
                                                <th className="p-3 border-b border-primary-200 w-24 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-center text-xs font-bold text-primary-800 uppercase tracking-wider">Qty</th>
                                                <th className="p-3 border-b border-primary-200 w-24 sticky top-0 z-20 bg-primary-100/90 backdrop-blur-sm text-center text-xs font-bold text-primary-800 uppercase tracking-wider rounded-tr-lg">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMaterials.length > 0 ? (
                                                filteredMaterials.map(material => {
                                                    const isLowStock = material.current_stock <= (material.min_stock || 0)
                                                    const rowBg = isLowStock ? 'bg-red-50 hover:bg-red-100/80 shadow-sm' : 'hover:bg-blue-50/50'
                                                    const cellBg = isLowStock ? 'bg-red-50/50 group-hover:bg-red-100/50' : 'bg-white group-hover:bg-blue-50/50'

                                                    return (
                                                        <tr key={material.id} className={`transition-all group border-l-4 ${isLowStock ? 'border-l-red-500 shadow-inner' : 'border-l-transparent'} ${rowBg}`}>
                                                            <td
                                                                className={`p-3 border-b ${isLowStock ? 'border-red-100 text-red-700' : 'border-slate-100 text-blue-600'} font-mono text-sm font-bold ${cellBg} cursor-pointer hover:underline`}
                                                                onClick={() => handlePartClick(material.part_number)}
                                                                title="Click to verify image"
                                                            >
                                                                {material.part_number}
                                                            </td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-sm text-slate-500 ${cellBg}`}>{material.name}</td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-sm text-slate-500 ${cellBg}`}>{material.process}</td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-sm text-slate-500 ${cellBg}`}>{material.area || material.Area}</td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-sm text-slate-500 ${cellBg}`}>{material.machine_asset}</td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-center font-bold text-sm ${cellBg} ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                                                {material.current_stock}
                                                            </td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} ${cellBg}`}>
                                                                <input
                                                                    type="number"
                                                                    className={`w-16 px-2 py-1 rounded border text-center focus:ring-2 outline-none transition-all ${isLowStock ? 'bg-red-50 border-red-200 focus:ring-red-500' : 'bg-slate-100 border-slate-200 focus:ring-primary-500'}`}
                                                                    min="1"
                                                                    value={qtyInputs[material.id] || ''}
                                                                    onChange={e => setQtyInputs({ ...qtyInputs, [material.id]: e.target.value })}
                                                                />
                                                            </td>
                                                            <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-center ${cellBg}`}>
                                                                <button
                                                                    onClick={() => handleAddToCart(material)}
                                                                    disabled={material.current_stock <= 0}
                                                                    className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isLowStock ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-600 hover:text-white'}`}
                                                                >
                                                                    <Plus size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
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
                                        disabled={cartItems.length === 0}
                                        className={`px-4 py-1.5 rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${cartItems.length === 0
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
                                                        ? `ring-2 ring-primary-500 border-primary-500 shadow-md z-10 ${isPending ? 'bg-yellow-50' : 'bg-white'}`
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
                                                disabled={cartItems.length === 0}
                                                className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 text-sm ${cartItems.length === 0
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
                            {/* Image Preview Modal */}
                            {isPreviewOpen && (
                                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setIsPreviewOpen(false); setPreviewPartNumber(''); }}>
                                    <div className="bg-white p-2 rounded-xl max-w-4xl max-h-[90vh] overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => { setIsPreviewOpen(false); setPreviewPartNumber(''); }}
                                            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
                                        >
                                            <X size={24} />
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <div className="bg-slate-100 w-full flex justify-center items-center rounded-lg overflow-hidden border border-slate-200">
                                                <img src={previewImage} alt="Material Preview" className="max-w-full max-h-[80vh] object-contain" />
                                            </div>
                                            <div className="mt-3 text-center">
                                                <p className="font-bold text-lg text-slate-800">{previewPartNumber}</p>
                                                <p className="text-xs text-slate-500 uppercase tracking-widest">Visual Verification</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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

