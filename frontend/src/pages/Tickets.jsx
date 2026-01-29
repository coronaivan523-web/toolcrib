import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Check, X, Clock, User, Package, FileText, Search, Eye, AlertCircle, Info, Box, AlertTriangle, MapPin, Image, Loader2, FileWarning, History, Activity, CheckCircle, List } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { ticketService } from '../services/tickets'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'
import RequisitionFormModal from '../components/RequisitionFormModal' // Import Modal
import RequisitionDetailModal from '../components/RequisitionDetailModal'
import PPEValidationModal from '../components/PPEValidationModal'
import PPEBlockModal from '../components/PPEBlockModal'

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
    // Define privileged roles that can see ALL tickets
    const privilegedRoles = ['admin', 'administrator', 'supervisor', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician']

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [materials, setMaterials] = useState([]) // For selection
    const [users, setUsers] = useState([]) // For requester selection
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
    const showNotification = (message, type = 'error', autoClose = false) => {
        setNotification({ message, type })
        // Auto-clear success/info messages, keep errors until fixed unless autoClose is true
        if (type !== 'error' || autoClose) {
            setTimeout(() => setNotification(null), type === 'error' ? 2000 : 4000)
        }
    }

    const [selectedTicketItem, setSelectedTicketItem] = useState(null)
    const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false)
    const [existingNotification, setExistingNotification] = useState(null)
    const [viewingRequisition, setViewingRequisition] = useState(null)
    const [isRequisitionDetailOpen, setIsRequisitionDetailOpen] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState(null) // For toolroom staff to select tickets for status changes

    // Processing Modal States
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false)
    const [processingTicket, setProcessingTicket] = useState(null)
    const [itemStatuses, setItemStatuses] = useState({}) // {itemId: {status: 'pending'|'fulfilled'|'cancelled', reason: ''}}
    const [viewingImageMaterial, setViewingImageMaterial] = useState(null)
    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [cancellingItemId, setCancellingItemId] = useState(null)
    const [cancellationReason, setCancellationReason] = useState('')
    const [actionProcessingId, setActionProcessingId] = useState(null) // New state for tracking button loading
    const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING') // CONNECTING, SUBSCRIBED, CLOSED, CHANNEL_ERROR

    // Quality Report States
    const [isQualityReportModalOpen, setIsQualityReportModalOpen] = useState(false)
    const [reportingTicket, setReportingTicket] = useState(null)
    const [reportStage, setReportStage] = useState('post_delivery') // 'processing' or 'post_delivery'
    const [issueCategory, setIssueCategory] = useState('')
    const [issueDescription, setIssueDescription] = useState('')
    const [actionTaken, setActionTaken] = useState('')
    const [supplierName, setSupplierName] = useState('')
    const [quantityAffected, setQuantityAffected] = useState('')
    const [selectedMaterialForReport, setSelectedMaterialForReport] = useState(null)

    // Filter States
    const [statusFilter, setStatusFilter] = useState('active') // 'active', 'closed', 'all'
    const [folioSearch, setFolioSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterType, setFilterType] = useState('all')

    // Report Notifications State
    const [reports, setReports] = useState([])
    const [isReportListModalOpen, setIsReportListModalOpen] = useState(false)
    const [selectedReports, setSelectedReports] = useState([]) // Array of report IDs
    const [isCreateRequisitionModalOpen, setIsCreateRequisitionModalOpen] = useState(false) // State for Req Modal
    const [initialRequisitionItems, setInitialRequisitionItems] = useState([]) // Pass to Req Modal

    const [showCancelledView, setShowCancelledView] = useState(false) // New State for Cancelled View Toggle


    // States for Cancelled Items Filters
    const [cancelledFilterFolio, setCancelledFilterFolio] = useState('');
    const [cancelledFilterMaterial, setCancelledFilterMaterial] = useState('');
    const [cancelledFilterRequester, setCancelledFilterRequester] = useState('');
    const [cancelledFilterCancelledBy, setCancelledFilterCancelledBy] = useState('');
    const [cancelledFilterDate, setCancelledFilterDate] = useState('');

    // PPE Validation State
    const [isPPEModalOpen, setIsPPEModalOpen] = useState(false)
    const [ppeItems, setPPEItems] = useState([])

    // PPE Blocking Logic (Modal)
    const [blockModalData, setBlockModalData] = useState({
        isOpen: false,
        blockedItems: [],
        employeeNumber: '',
        operatorName: '',
        history: []
    })

    // Get adminViewMode from Layout context
    const context = useOutletContext() || {}
    const { adminViewMode = 'admin' } = context

    // Helper to check low stock
    const isItemLowStock = (material) => {
        if (!material) return false;
        return (material.current_stock || 0) <= (material.min_stock || 0);
    }

    useEffect(() => {
        fetchUserAndTickets()
        fetchMaterials()
        fetchProfiles()
    }, [adminViewMode]) // Reload when view mode changes

    // REALTIME SUBSCRIPTION
    // REALTIME SUBSCRIPTION
    useEffect(() => {
        const channel = supabase
            .channel('tickets-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                (payload) => {
                    console.log('Realtime change received (tickets)!', payload)
                    fetchUserAndTickets(true)
                    fetchMaterials()
                    // fetchProfiles() // usually static but good to have if new employees added
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ticket_items' },
                (payload) => {
                    console.log('Realtime change received (ticket_items)!', payload)
                    fetchUserAndTickets(true)
                    fetchMaterials()
                }
            )
            .subscribe((status) => {
                console.log('Realtime Status:', status)
                setRealtimeStatus(status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, department, job_title, position')
                .order('full_name');

            if (error) {
                console.error('Error fetching profiles:', error);
            } else {
                setUsers(data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching profiles:', err);
        }
    };



    const fetchUserAndTickets = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) setLoading(true)
        try {
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
                const isAdminRole = profile?.role === 'admin' || profile?.role === 'supervisor' || profile?.role === 'toolroom_staff'
                setIsAdmin(isAdminRole)

                // 1. Define Ticket Query
                let ticketQuery = supabase.from('tickets')
                    .select(`
                    *, 
                    items:ticket_items(
                        *, 
                        material:materials(
                            id,
                            name, 
                            part_number, 
                            description,
                            location,
                            current_stock, 
                            min_stock,
                            image_url,
                            supplier
                        )
                    ),
                    quality_reports(*), 
                    requester:profiles!tickets_requester_id_fkey(email, full_name),
                    employee_number,
                    operator_name
                `)
                    .order('created_at', { ascending: false })
                    .limit(200) // Optimization: Limit to recent tickets for speed

                if (!privilegedRoles.includes(profile?.role)) {
                    ticketQuery = ticketQuery.eq('requester_id', user.id)
                }

                // 2. Define Notification & Report Queries (Admin/Staff Only) - In Parallel
                let notificationPromise = Promise.resolve({ data: [], error: null })
                let qualityReportPromise = Promise.resolve({ data: [], error: null })

                if (isAdminRole) {
                    notificationPromise = supabase
                        .from('notifications')
                        .select('*')
                        .eq('type', 'low_stock_alert')
                        .eq('status', 'unread')
                        .order('created_at', { ascending: false })

                    qualityReportPromise = supabase
                        .from('quality_reports')
                        .select('*')
                        .eq('action_taken', 'pending_review')
                        .order('created_at', { ascending: false })
                }

                // 3. EXECUTE IN PARALLEL
                const [ticketRes, notifRes, qualityRes] = await Promise.all([
                    ticketQuery,
                    notificationPromise,
                    qualityReportPromise
                ])

                const { data, error: queryError } = ticketRes
                if (queryError) {
                    console.error("Error fetching tickets:", queryError)
                    setError(queryError)
                }

                // Generate signed URLs for material images in parallel
                if (data) {
                    // Collect all user IDs needed (requesters are already joined, but need cancellers)
                    const cancellerIds = new Set()
                    data.forEach(t => t.items?.forEach(i => {
                        if (i.cancelled_by) cancellerIds.add(i.cancelled_by)
                    }))

                    // Fetch canceller profiles if any
                    let cancellersMap = {}
                    if (cancellerIds.size > 0) {
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, full_name, email')
                            .in('id', Array.from(cancellerIds))

                        if (profiles) {
                            profiles.forEach(p => cancellersMap[p.id] = p)
                        }
                    }

                    // Optimization: Use public URLs instead of signing each one (N+1 query fix)
                    const ticketsWithProcessedItems = data.map(ticket => {
                        if (!ticket.items) return ticket;

                        const itemsWithUrls = ticket.items.map(item => {
                            // Attach canceller manually
                            if (item.cancelled_by) {
                                item.canceller = cancellersMap[item.cancelled_by]
                            }

                            // Use Public URL directly
                            if (item.material?.image_url) {
                                let finalImageUrl = item.material.image_url
                                if (!finalImageUrl.startsWith('http')) {
                                    finalImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${item.material.image_url}`
                                }
                                item.material.signed_image_url = finalImageUrl
                            }
                            return item
                        })
                        return { ...ticket, items: itemsWithUrls }
                    })
                    setTickets(ticketsWithProcessedItems)
                }

                // Fetch Notifications & Reports for Tool Room Staff
                if (isAdminRole) {
                    const { data: notifs, error: notifError } = notifRes
                    const { data: qualityReports, error: qualityError } = qualityRes

                    const allItems = []

                    // Normalize Notifications
                    if (notifs) {
                        notifs.forEach(n => allItems.push({
                            ...n,
                            _globalType: 'notification',
                            sender_id: n.sender_id,
                            material_id: n.material_id
                        }))
                    }

                    // Normalize Quality Reports
                    if (qualityReports) {
                        qualityReports.forEach(q => allItems.push({
                            id: `qr-${q.id}`, // Avoid ID collisions
                            created_at: q.created_at,
                            message: `Quality Issue: ${q.description} (${q.issue_category})`,
                            type: 'quality_report',
                            status: 'unread', // UI treats them as unread/active
                            sender_id: q.reported_by_id, // Match sender_id expectation
                            material_id: q.material_id,   // Match material_id expectation
                            _globalType: 'quality_report',
                            original_data: q
                        }))
                    }

                    if (allItems.length > 0) {
                        const senderIds = [...new Set(allItems.map(n => n.sender_id).filter(Boolean))]
                        const materialIds = [...new Set(allItems.map(n => n.material_id).filter(Boolean))]

                        // Fetch Senders & Materials in Parallel
                        const [sendersRes, matsRes] = await Promise.all([
                            senderIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', senderIds) : Promise.resolve({ data: [] }),
                            materialIds.length > 0 ? supabase.from('materials').select('id, name, part_number, unit, unit_of_measure, image_url').in('id', materialIds) : Promise.resolve({ data: [] })
                        ])

                        let sendersMap = {}
                        if (sendersRes.data) sendersRes.data.forEach(s => sendersMap[s.id] = s)

                        let materialsMap = {}
                        // Use forEach to map all materials, fixing previous find() inefficiency
                        if (matsRes.data) matsRes.data.forEach(m => materialsMap[m.id] = m)

                        const enrichedReports = allItems.map(n => ({
                            ...n,
                            sender: sendersMap[n.sender_id] || { full_name: 'Unknown User', email: '' },
                            material: materialsMap[n.material_id] || { name: 'Unknown Material', part_number: 'N/A' }
                        }))

                        // Sort combined list by date desc
                        enrichedReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

                        setReports(enrichedReports)
                    } else {
                        setReports([])
                    }

                    if (notifError) console.error("Error fetching notifications:", notifError)
                    if (qualityError) console.error("Error fetching quality reports:", qualityError)
                }
            }
        } catch (err) {
            console.error("CRITICAL ERROR in fetchUserAndTickets:", err)
            setError(err)
        } finally {
            setLoading(false)
        }
    }

    const [editingItemIndex, setEditingItemIndex] = useState(null)

    const fetchMaterials = async () => {
        // Fetch extended fields including pending_stock
        const { data } = await supabase
            .from('materials')
            .select('*')
            .eq('status', 'active')
            .order('name')

        if (data) {
            // Process images to be full URLs
            const processedData = data.map(m => {
                let imageUrl = m.image_url
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${imageUrl}`
                }
                return { ...m, image_url: imageUrl }
            })
            setMaterials(processedData)
        }
    }

    // Filter Logic
    const hasActiveFilters = searchDesc || searchPart || filterCategory !== 'all' || filterType !== 'all' || filterProcess !== 'all' || filterArea !== 'all' || filterMachine !== 'all'

    // PPE Authorization Check
    // PPE Authorization Check
    // "only can leave request PPE (epp) to the role of administrator and security (seguridad)"
    // EXPANDED ROLES: Added 'seguridad' and Ensure case-insensitivity
    const authorizedPPERoles = ['admin', 'administrator', 'security', 'supervisor', 'seguridad', 'manager']
    const canRequestPPE = userProfile && authorizedPPERoles.some(r => r.toLowerCase() === userProfile.role?.toLowerCase())

    // DEBUG: Log role check
    console.log('PPE Check:', { role: userProfile?.role, authorized: canRequestPPE })

    const filteredMaterials = hasActiveFilters ? materials.filter(m => {
        const descMatch = !searchDesc || m.name?.toLowerCase().includes(searchDesc.toLowerCase())
        const partMatch = !searchPart || m.part_number?.toLowerCase().includes(searchPart.toLowerCase())
        // Handle Area/area ambiguity
        const mArea = m.area || m.Area || ''

        const categoryMatch = filterCategory === 'all' || (m.category || '') === filterCategory
        const typeMatch = filterType === 'all' || (m.material_type || '') === filterType
        const processMatch = filterProcess === 'all' || (m.process || '') === filterProcess
        const areaMatch = filterArea === 'all' || mArea === filterArea
        const machineMatch = filterMachine === 'all' || (m.machine_asset || '') === filterMachine

        // PPE Restriction: Filter out EPP items if not authorized
        let ppeMatch = true
        if (!canRequestPPE) {
            const isEPP = (m.category && m.category.toUpperCase() === 'EPP') || m.is_ppe
            if (isEPP) ppeMatch = false
        }

        return descMatch && partMatch && categoryMatch && typeMatch && processMatch && areaMatch && machineMatch && ppeMatch
    }) : []

    // Unique options for Selects
    // Unique options for Selects (Independent to prevent "elimination" perception)
    const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))]
        .filter(c => canRequestPPE || c.toUpperCase() !== 'EPP') // Hide EPP from category list
        .sort()
    const uniqueTypes = [...new Set(materials.map(m => m.material_type).filter(Boolean))].sort()
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

    const handleRequisitionSuccess = async () => {
        console.log("handleRequisitionSuccess triggered. Selected Reports:", selectedReports)

        // Mark selected reports as read so they disappear from the list
        if (selectedReports.length > 0) {
            const notificationIds = []
            const qualityReportIds = []

            selectedReports.forEach(id => {
                if (String(id).startsWith('qr-')) {
                    qualityReportIds.push(id.replace('qr-', ''))
                } else {
                    notificationIds.push(id)
                }
            })

            try {
                let archivedCount = 0

                // 1. Update Notifications
                if (notificationIds.length > 0) {
                    const { data, error } = await supabase
                        .from('notifications')
                        .update({ status: 'read' })
                        .in('id', notificationIds)
                        .select()

                    if (error) throw error
                    if (data) archivedCount += data.length
                }

                // 2. Update Quality Reports
                if (qualityReportIds.length > 0) {
                    const { data, error } = await supabase
                        .from('quality_reports')
                        .update({ action_taken: 'accepted_with_note' }) // Moves them out of 'pending_review'
                        .in('id', qualityReportIds)
                        .select()

                    if (error) throw error
                    if (data) archivedCount += data.length
                }

                if (archivedCount !== selectedReports.length) {
                    // console.warn optional
                }

                showNotification(`Requisition created! Archived ${selectedReports.length} reports.`, "success")
            } catch (err) {
                console.error("Error updating reports:", err)
                showNotification("Requisition created, but failed to hide reports. Please check console.", "error")
            }
        } else {
            console.warn("No reports selected to archive.")
        }

        // Delay fetch slightly to ensure DB propagation if needed (usually instant but safety net)
        setTimeout(() => {
            fetchUserAndTickets(true)
        }, 500)

        setIsCreateRequisitionModalOpen(false)
        setInitialRequisitionItems([])
        setSelectedReports([])
    }

    const handleAddToCart = (material) => {
        // centralized check
        if (checkPendingAction()) return

        const qtyToOrder = parseInt(qtyInputs[material.id] || 1)
        if (qtyToOrder <= 0) return

        // Check if quantity exceeds available stock (Current - Pending)
        const pendingStock = material.pending_stock || 0
        const availableStock = Math.max(0, (material.current_stock || 0) - pendingStock)

        if ((material.current_stock || 0) <= 0 || qtyToOrder > availableStock) {
            showNotification(`Cannot request ${qtyToOrder} units. Only ${availableStock} units available (${pendingStock} pending in other requests).`, 'error')
            return
        }

        // Check if material already exists in cart
        const existingItem = cartItems.find(item => item.material_id === material.id)
        if (existingItem) {
            showNotification(`${material.part_number} is already in your cart. Please remove it first if you want to change the quantity.`, 'error')
            return
        }

        // Add item to existing cart (allow multiple materials)
        const newItem = {
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
        }

        const newCart = [...cartItems, newItem]
        setCartItems(newCart)

        // Auto-select the newly added item for editing
        const newIndex = newCart.length - 1
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
            // All items confirmed - clear form but keep panel open for adding more materials
            setEditingItemIndex(null)
            setJobPlant('')
            setJobArea('')
            setJobMachine('')
            setJobProcess('')
        }
    }

    const processTicketSubmission = async (extraData = {}) => {
        try {
            // Create Ticket Container (Header)
            const ticketPayload = {
                requester_id: currentUser.id,
                status: 'pending'
            };

            // Add operator details if present
            if (extraData.operatorName) {
                ticketPayload.operator_name = extraData.operatorName;
            }
            // Add employee number if present
            if (extraData.employeeNumber) {
                ticketPayload.employee_number = extraData.employeeNumber;

                // VALIDITY CHECK using EMPLOYEE NUMBER
                // Gather potential PPE items to check
                const ppeMaterialIds = cartItems
                    .filter(item => (item.material.category && item.material.category.toUpperCase() === 'EPP') || item.material.is_ppe)
                    .map(item => item.material_id);

                if (ppeMaterialIds.length > 0) {
                    const { data: blockedItems, error: checkError } = await supabase
                        .rpc('check_ppe_eligibility', {
                            p_employee_number: extraData.employeeNumber,
                            p_material_ids: ppeMaterialIds
                        });

                    if (checkError) throw checkError;

                    if (blockedItems && blockedItems.length > 0) {
                        // Found valid items! Fetch history and open Block Modal.

                        // 1. Fetch Request History for this Employee using RPC to bypass RLS
                        const { data: requestHistory, error: historyError } = await supabase
                            .rpc('get_employee_ppe_history', {
                                p_employee_number: extraData.employeeNumber,
                                p_operator_name: extraData.operatorName // Pass name for fallback matching
                            });

                        if (historyError) {
                            console.error("RPC Error (get_employee_ppe_history):", historyError); // Log detailed error
                            // Fallback to simple toast if history fails
                            const conflictList = blockedItems.map(b =>
                                `• ${b.material_name} (Expires: ${b.renewal_date}, Ref: #${b.ticket_folio})`
                            ).join('\n');
                            showNotification(`Cannot issue items. Employee #${extraData.employeeNumber} has active deliveries.\n${conflictList}`, 'error');
                            return;
                        }


                        // 2. Open Block Modal
                        // INJECT MISSING ITEMS: Ensure blocked items appear in history even if RPC missed them
                        const historyWithBlocked = [...(requestHistory || [])];

                        console.log("Blocking items to verify:", blockedItems);

                        blockedItems.forEach(blocked => {
                            // Check if this blocking ticket is already in the history list (match by folio AND material)
                            // Use String() to ensure BigInt/Number compatibility
                            const exists = historyWithBlocked.some(h =>
                                String(h.ticket_folio || h.folio) === String(blocked.ticket_folio) &&
                                (h.material_name || '').trim().toLowerCase() === (blocked.material_name || '').trim().toLowerCase()
                            );

                            if (!exists) {
                                console.log("Injecting missing blocked ticket into history:", blocked.ticket_folio);
                                // Manually construct a history record from the blocked item data
                                historyWithBlocked.unshift({
                                    id: `injected-${blocked.ticket_folio}`, // Temporary ID
                                    created_at: blocked.last_delivery_date, // Timestamp
                                    ticket_created_at: blocked.last_delivery_date, // Consistent timestamp
                                    ticket_folio: blocked.ticket_folio,
                                    requester_name: extraData.operatorName || 'System', // Fallback
                                    material_name: blocked.material_name,
                                    part_number: 'Ref-Block',
                                    quantity: 1,
                                    renewal_date: blocked.renewal_date,
                                    is_restock: false
                                });
                            }
                        });

                        // Re-sort by date descending to ensure injected items are in correct position
                        historyWithBlocked.sort((a, b) => {
                            const dateA = new Date(a.ticket_created_at || a.created_at || 0);
                            const dateB = new Date(b.ticket_created_at || b.created_at || 0);
                            return dateB - dateA;
                        });

                        setBlockModalData({
                            isOpen: true,
                            blockedItems: blockedItems,
                            employeeNumber: extraData.employeeNumber,
                            operatorName: extraData.operatorName,
                            history: historyWithBlocked,
                            renewalDates: extraData.renewalDates // Pass captured dates
                        });

                        return; // STOP EXECUTION
                    }
                }
            }

            const { data: ticket, error: ticketError } = await supabase.from('tickets').insert([ticketPayload]).select().single()

            if (ticketError) throw ticketError

            // Map items using their INDIVIDUAL Job Details
            const items = cartItems.map(item => ({
                ticket_id: ticket.id,
                material_id: item.material_id,
                quantity_requested: item.quantity,
                plant: item.details.plant,
                area: item.details.area,
                line_machine: item.details.machine,
                process: item.details.process,
                // Add renewal date if present for this specific item
                renewal_date: extraData.renewalDates?.[item.material_id] || null
            }))

            const { error: itemsError } = await supabase.from('ticket_items').insert(items)
            if (itemsError) throw itemsError

            setIsCreateModalOpen(false)
            setIsPPEModalOpen(false) // Close PPE modal if open
            setCartItems([])
            // Clear Job Details
            setJobPlant('')
            setJobArea('')
            setJobMachine('')
            setJobProcess('')

            // Clear Filters
            setSearchDesc('')
            setSearchPart('')
            setFilterCategory('all')
            setFilterType('all')
            setFilterProcess('all')
            setFilterArea('all')
            setFilterMachine('all')

            setNotification(null) // Clear any persistent errors

            fetchUserAndTickets()
            fetchMaterials() // Refresh stock to update pending counts
            showNotification("Ticket created successfully!", 'success')

        } catch (error) {
            console.error(error)
            showNotification("Error creating ticket: " + error.message, 'error')
        }
    }

    const handleRestock = async (itemsInput, empNum, opName, renewalDates = {}) => {
        try {
            // Normalize input to array (support both single item and array)
            const itemsToRestock = Array.isArray(itemsInput) ? itemsInput : [itemsInput];

            if (itemsToRestock.length === 0) return;

            // IMMEDIATE CLOSE: Close all modals first for better UX
            setBlockModalData(prev => ({ ...prev, isOpen: false }));
            setIsPPEModalOpen(false); // Close the underlying PPE Verification modal
            setIsCreateRequisitionModalOpen(false); // Close the Request Form modal
            setIsCreateModalOpen(false); // Close the main Ticket Create modal
            setIsRequisitionDetailOpen(false); // Close detail modal if that was the entry point
            setCartItems([]);

            // Create Ticket for Restock (One ticket for all selected items)
            const ticketPayload = {
                requester_id: currentUser.id,
                status: 'pending',
                employee_number: empNum,
                operator_name: opName
            };

            const { data: ticket, error: ticketError } = await supabase.from('tickets').insert([ticketPayload]).select().single();
            if (ticketError) throw ticketError;

            // Prepare Items payload
            const itemsPayload = itemsToRestock.map(item => ({
                ticket_id: ticket.id,
                material_id: item.material_id,
                quantity_requested: 1,
                is_restock: true, // FLAG AS RESTOCK
                renewal_date: renewalDates[item.material_id] ? new Date(renewalDates[item.material_id]).toISOString() : null
            }));

            const { error: itemError } = await supabase.from('ticket_items').insert(itemsPayload);
            if (itemError) throw itemError;

            // Force refresh to ensure we get the ticket AND its items
            await fetchUserAndTickets(true)

            showNotification(`Restock ticket #${ticket.folio} created with ${itemsPayload.length} items.`, 'success');

        } catch (error) {
            console.error(error)
            showNotification("Error creating restock ticket: " + error.message, 'error')
        }
    };

    const handleCreateTicket = async () => {
        if (cartItems.length === 0) {
            showNotification("Please add items to your request.", 'error')
            return
        }

        if (checkPendingAction()) return

        // Check for PPE items in the cart
        // We check 'Category' (text) or 'is_ppe' (boolean) to be safe
        const eppItemsInCart = cartItems.filter(item =>
            (item.material.category && item.material.category.toUpperCase() === 'EPP') ||
            item.material.is_ppe === true
        );

        if (eppItemsInCart.length > 0) {
            // STRICT AUTHORIZATION CHECK
            if (!canRequestPPE) {
                showNotification("Unauthorized: You do not have permission to request PPE (EPP) items. Only Security and Admin can request these.", 'error')
                return
            }

            setPPEItems(eppItemsInCart);
            setIsPPEModalOpen(true);
            return;
        }

        // If no PPE items, proceed with standard submission
        await processTicketSubmission();
    }



    const handleItemClick = (item) => {
        setNotification(null)
        // Only allow selection of low stock items
        if (isItemLowStock(item.material)) {
            setSelectedTicketItem(item)
        }
    }

    // Tool Room Staff Status Management Functions
    const handleStartProcessing = async (ticket) => {
        console.log('handleStartProcessing called with ticket:', ticket)

        if (!ticket) {
            console.error('No ticket provided')
            showNotification('Please select a ticket first', 'error')
            return
        }

        if (!ticket.items || ticket.items.length === 0) {
            console.error('Ticket has no items:', ticket)
            showNotification('This ticket has no items to process', 'error')
            return
        }

        setActionProcessingId(ticket.id) // Start loading
        try {
            // Get current user first
            const { data: { user } } = await supabase.auth.getUser()

            // Check if ticket is already being processed by someone else
            const { data: currentTicket, error: fetchError } = await supabase
                .from('tickets')
                .select('processing_by')
                .eq('id', ticket.id)
                .single()

            if (fetchError) throw fetchError

            // If someone else is already processing this ticket
            if (currentTicket.processing_by && currentTicket.processing_by !== user.id) {
                showNotification(`This ticket is already being processed by another user`, 'error')
                return
            }

            // Update ticket to mark as being processed by current user
            const { error: updateError } = await supabase
                .from('tickets')
                .update({
                    status: 'IN_PROCESS',
                    processing_by: user.id,
                    processing_started_at: new Date().toISOString()
                })
                .eq('id', ticket.id)

            if (updateError) throw updateError

            console.log('Opening processing modal with ticket:', ticket)

            // Open processing modal
            setProcessingTicket(ticket)

            // Initialize item statuses
            const initialStatuses = {}
            ticket.items?.forEach(item => {
                initialStatuses[item.id] = {
                    status: item.item_status || 'pending',
                    reason: item.cancellation_reason || ''
                }
            })
            setItemStatuses(initialStatuses)
            setIsProcessingModalOpen(true)

            fetchUserAndTickets(true)
        } catch (error) {
            console.error('Error starting processing:', error)
            showNotification('Error starting ticket processing', 'error')
        } finally {
            setActionProcessingId(null) // Stop loading
        }
    }

    const handleMarkReady = async (ticketId) => {
        setActionProcessingId(ticketId)
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: 'READY' })
                .eq('id', ticketId)

            if (error) throw error

            if (error) throw error

            fetchUserAndTickets(true)
            fetchMaterials() // Refresh logic
            showNotification('Ticket marked as READY for pickup', 'success')
        } catch (error) {
            console.error('Error updating ticket:', error)
            showNotification('Error updating ticket status', 'error')
        } finally {
            setActionProcessingId(null)
        }
    }

    const handleDeliverTicket = async (ticketId) => {
        console.log('handleDeliverTicket called with ticketId:', ticketId)

        if (!ticketId) {
            console.error('No ticket ID provided')
            showNotification('Please select a ticket first', 'error')
            return
        }

        setActionProcessingId(ticketId)

        try {
            // Verify service availability
            if (!ticketService || !ticketService.closeTicket) {
                throw new Error('Ticket Service not initialized or missing closeTicket method')
            }

            // Use Backend API to close ticket (handles stock deduction + history logging)
            console.log('Calling ticketService.closeTicket...')
            await ticketService.closeTicket(ticketId)
            console.log('ticketService.closeTicket completed successfully')

            // Legacy Client-Side Logic Removed to prevent duplication/errors
            // Backend now handles: Stock Deduction, Status Update, History Logging

            setSelectedTicket(null) // Clear selection
            await fetchUserAndTickets(true) // Ensure this waits
            showNotification('Ticket delivered and stock updated', 'success')
        } catch (error) {
            console.error('Error closing ticket:', error)
            showNotification('Error closing ticket: ' + (error.message || error), 'error', true)
        } finally {
            // Force reset to ensure UI unlocks
            console.log('Fulfilling handleDeliverTicket action')
            setActionProcessingId(null)
        }
    }

    const handleCancelTicket = async (ticketId) => {
        const reason = prompt('Enter reason for cancellation:')
        if (!reason) return

        try {
            setActionProcessingId(ticketId)
            const { error } = await supabase
                .from('tickets')
                .update({
                    status: 'CANCELLED',
                    cancellation_reason: reason,
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', ticketId)

            if (error) throw error

            // Update all items belonging to this ticket
            const { error: itemsError } = await supabase
                .from('ticket_items')
                .update({
                    item_status: 'cancelled',
                    cancellation_reason: reason,
                    cancelled_by: currentUser?.id,
                    cancelled_at: new Date().toISOString()
                })
                .eq('ticket_id', ticketId)

            if (itemsError) throw itemsError

            fetchUserAndTickets(true)
            showNotification('Ticket cancelled', 'success')
        } catch (error) {
            console.error('Error cancelling ticket:', error)
            showNotification('Error cancelling ticket', 'error')
        } finally {
            setActionProcessingId(null)
        }
    }

    // Processing Modal Item Management Functions
    const handleFulfillItem = (itemId) => {
        setItemStatuses(prev => ({
            ...prev,
            [itemId]: { status: 'fulfilled', reason: '' }
        }))
    }

    const handleCancelItem = (itemId) => {
        setCancellingItemId(itemId)
        setCancellationReason('')
        setCancelModalOpen(true)
    }

    const confirmCancelItem = () => {
        if (!cancellationReason || cancellationReason.trim() === '') {
            showNotification('Cancellation reason is required', 'error')
            return
        }

        setItemStatuses(prev => ({
            ...prev,
            [cancellingItemId]: { status: 'cancelled', reason: cancellationReason.trim() }
        }))

        setCancelModalOpen(false)
        setCancellingItemId(null)
        setCancellationReason('')
    }

    const handleViewItemImage = (material) => {
        setViewingImageMaterial(material)
    }

    const handleCancelProcessingSession = async (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        console.log('Cancel Processing Session Clicked', processingTicket)

        if (!processingTicket) {
            console.error('No processing ticket found in state')
            return
        }

        // ACTION: Cancel immediately without confirmation (User request)
        try {
            console.log('handleCancelProcessingSession: Reverting ticket status to PENDIENTE', processingTicket.id)

            // Revert ticket status to PENDIENTE and clear processing info
            const { error } = await supabase
                .from('tickets')
                .update({
                    status: 'PENDIENTE',
                    processing_by: null,
                    processing_started_at: null
                })
                .eq('id', processingTicket.id)

            if (error) {
                console.error('handleCancelProcessingSession: Supabase error:', error)
                throw error
            }

            console.log('handleCancelProcessingSession: Ticket status reverted successfully')

            setIsProcessingModalOpen(false)
            setProcessingTicket(null)
            setItemStatuses({}) // Clear local item statuses
            fetchUserAndTickets(true) // Refresh list
            showNotification('Processing session cancelled. Ticket returned to PENDING.', 'info')

        } catch (error) {
            console.error('handleCancelProcessingSession: Error cancelling processing session:', error)
            showNotification('Error cancelling processing session: ' + error.message, 'error')
        }
    }

    const handleFinishProcessing = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Update each item's status in the database
            for (const [itemId, itemData] of Object.entries(itemStatuses)) {
                const updateData = {
                    item_status: itemData.status,
                    cancellation_reason: itemData.status === 'cancelled' ? itemData.reason : null
                }

                if (itemData.status === 'fulfilled') {
                    updateData.fulfilled_by = user.id
                    updateData.fulfilled_at = new Date().toISOString()
                } else if (itemData.status === 'cancelled') {
                    updateData.cancelled_by = user.id
                    updateData.cancelled_at = new Date().toISOString()
                }

                const { error } = await supabase
                    .from('ticket_items')
                    .update(updateData)
                    .eq('id', itemId)

                if (error) throw error
            }

            // Check if all items are fulfilled or cancelled
            const allItemsProcessed = Object.values(itemStatuses).every(
                item => item.status === 'fulfilled' || item.status === 'cancelled'
            )

            // Update ticket status
            const ticketUpdate = {
                processing_by: null,
                processing_started_at: null
            }

            if (allItemsProcessed) {
                const allFulfilled = Object.values(itemStatuses).every(item => item.status === 'fulfilled')
                const allCancelled = Object.values(itemStatuses).every(item => item.status === 'cancelled')

                if (allCancelled) {
                    ticketUpdate.status = 'CANCELLED'
                } else if (allFulfilled) {
                    ticketUpdate.status = 'READY'
                } else {
                    ticketUpdate.status = 'PARTIALLY_FULFILLED'
                }
            }

            const { error: ticketError } = await supabase
                .from('tickets')
                .update(ticketUpdate)
                .eq('id', processingTicket.id)

            if (ticketError) throw ticketError

            // Close modal and refresh
            setIsProcessingModalOpen(false)
            setProcessingTicket(null)
            setItemStatuses({})
            fetchUserAndTickets(true)
            showNotification('Ticket processing completed', 'success')
        } catch (error) {
            console.error('Error finishing processing:', error)
            showNotification('Error saving item statuses', 'error')
        }
    }

    // Quality Report Functions
    const handleOpenQualityReport = (ticket, stage = 'post_delivery') => {
        setReportingTicket(ticket)
        setReportStage(stage)
        setIssueCategory('')
        setIssueDescription('')
        setActionTaken(stage === 'post_delivery' ? 'accepted_with_note' : 'pending_review')
        setSupplierName('')
        setQuantityAffected('')
        setSelectedMaterialForReport(null)
        setIsQualityReportModalOpen(true)
    }

    const handleSubmitQualityReport = async () => {
        // Validation
        if (!issueCategory) {
            showNotification('Please select an issue category', 'error')
            return
        }
        if (!issueDescription.trim()) {
            showNotification('Please provide a description of the issue', 'error')
            return
        }
        if (!selectedMaterialForReport) {
            showNotification('Please select a material', 'error')
            return
        }

        // Validate Quantity Affected against Quantity Requested
        if (quantityAffected) {
            const affectedQty = parseInt(quantityAffected)
            let requestedQty = 0

            // Try to find quantity from selectedMaterialForReport first (if available)
            if (selectedMaterialForReport.quantity_requested) {
                requestedQty = selectedMaterialForReport.quantity_requested
            }
            // Fallback: try to find item in reportingTicket if available
            else if (reportingTicket && reportingTicket.items) {
                const item = reportingTicket.items.find(i => i.material?.id === selectedMaterialForReport.material_id || i.material_id === selectedMaterialForReport.material_id)
                if (item) requestedQty = item.quantity_requested
            }

            if (requestedQty > 0 && affectedQty > requestedQty) {
                showNotification(`Quantity affected (${affectedQty}) cannot be greater than requested quantity (${requestedQty})`, 'error', true)
                return
            }
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const reportData = {
                material_id: selectedMaterialForReport.material_id,
                report_stage: reportStage,
                issue_category: issueCategory,
                description: issueDescription.trim(),
                ticket_id: reportingTicket.id,
                reported_by_id: user.id,
                action_taken: actionTaken || 'pending_review',
                supplier_name: supplierName.trim() || null,
                quantity_affected: quantityAffected ? parseInt(quantityAffected) : null
            }

            const { error } = await supabase
                .from('quality_reports')
                .insert([reportData])

            if (error) throw error

            setIsQualityReportModalOpen(false)
            showNotification('Quality report submitted successfully', 'success')

            // If reporting during processing flow, we need to exit the processing state cleanly
            if (reportStage === 'processing') {
                // Revert ticket to CANCELLED (as per user request)
                const { error: updateError } = await supabase
                    .from('tickets')
                    .update({
                        status: 'CANCELLED',
                        processing_by: null,
                        processing_started_at: null
                    })
                    .eq('id', reportingTicket.id)

                if (updateError) {
                    console.error('Error reverting ticket status:', updateError)
                }

                // IMPORTANT: Update the specific ticket item with the cancellation reason (from report description)
                // This ensures the red box reason appears in the ticket list
                if (selectedMaterialForReport && selectedMaterialForReport.id) { // selectedMaterialForReport here acts as the ticket item wrapper in some contexts, let's verify
                    // Actually selectedMaterialForReport might be just constructed data. Let's find the correct item ID.
                    // In handleOpenQualityReport (processing flow), we set selectedMaterialForReport = item.

                    const itemIdToUpdate = selectedMaterialForReport.id
                    if (itemIdToUpdate) {
                        const { error: itemUpdateError } = await supabase
                            .from('ticket_items')
                            .update({
                                cancellation_reason: issueDescription.trim(),
                                status: 'cancelled',
                                cancelled_by: user.id,
                                cancelled_at: new Date().toISOString()
                            })
                            .eq('id', itemIdToUpdate)

                        if (itemUpdateError) {
                            console.error('Error updating item cancellation reason:', itemUpdateError)
                        }
                    }
                }

                // Close all related modals and clear state
                setIsProcessingModalOpen(false)
                setProcessingTicket(null)
                setCancelModalOpen(false)
                setCancellingItemId(null)
                setItemStatuses({})
            }

            fetchUserAndTickets(true) // Refresh to show report indicator
        } catch (error) {
            console.error('Error submitting quality report:', error)
            showNotification('Error submitting quality report: ' + error.message, 'error')
        }
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
        setFilterCategory('all')
        setFilterType('all')
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

            // Refresh global data (counters, report lists)
            fetchUserAndTickets(true)

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

    const handleCloseRequirementModal = () => {
        setIsRequirementModalOpen(false)
        setNotification(null)
        setExistingNotification(null)
    }

    // Dashboard Metrics
    const pendingCount = tickets.filter(t => t.status === 'pending' || t.status === 'PENDIENTE').length
    const inProcessCount = tickets.filter(t => t.status === 'IN_PROCESS' || t.status === 'EN PROCESO').length
    const readyCount = tickets.filter(t => t.status === 'READY' || t.status === 'LISTO').length

    const headerStats = (
        <div className="flex items-center gap-4">
            {/* Pending Requests (Left) */}
            <div className="bg-amber-100/20 border border-amber-200/30 rounded-md px-3 py-1 flex items-center gap-2">
                <div className="bg-amber-500 text-white p-1 rounded-full shadow-sm animate-pulse">
                    <AlertCircle size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-amber-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">Pending</span>
                    <span className="text-white font-bold text-base leading-none">{pendingCount}</span>
                </div>
            </div>

            {/* Status: In Process */}
            <div className="bg-blue-100/20 border border-blue-200/30 rounded-md px-3 py-1 flex items-center gap-2">
                <div className="bg-blue-500 text-white p-1 rounded-full shadow-sm">
                    <Clock size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-blue-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">In Process</span>
                    <span className="text-white font-bold text-base leading-none">{inProcessCount}</span>
                </div>
            </div>

            {/* Status: Ready */}
            <div className="bg-green-100/20 border border-green-200/30 rounded-md px-3 py-1 flex items-center gap-2">
                <div className="bg-green-500 text-white p-1 rounded-full shadow-sm">
                    <Check size={14} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-green-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">Ready</span>
                    <span className="text-white font-bold text-base leading-none">{readyCount}</span>
                </div>
            </div>

            {/* Reports Button (Only for Tool Room Staff & Supervisors) */}
            {(userProfile?.role === 'toolroom_staff' || userProfile?.role === 'supervisor' || (userProfile?.role === 'admin' && adminViewMode === 'toolroom')) && (
                <button
                    onClick={() => setIsReportListModalOpen(true)}
                    className="bg-purple-100/20 border border-purple-200/30 rounded-md px-3 py-1 flex items-center gap-2 hover:bg-purple-100/30 transition-colors cursor-pointer"
                >
                    <div className="bg-purple-500 text-white p-1 rounded-full shadow-sm">
                        <FileWarning size={14} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-purple-200 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">Reports</span>
                        <span className="text-white font-bold text-base leading-none">{reports.length}</span>
                    </div>
                </button>
            )}
            {/* Requisition Detail Modal (Read-Only Mode) */}
            {isRequisitionDetailOpen && (
                <RequisitionDetailModal
                    isOpen={isRequisitionDetailOpen}
                    onClose={() => {
                        setIsRequisitionDetailOpen(false)
                        setViewingRequisition(null)
                    }}
                    requisition={viewingRequisition}
                    materials={materials.reduce((acc, mat) => ({ ...acc, [mat.id]: mat }), {})}
                    usersMap={undefined}
                    currentUser={currentUser}
                    onActionSuccess={() => { }}
                />
            )}

        </div>
    )

    return (

        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
            {/* Notifications */}
            {notification && (
                <div className={`absolute top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300 max-w-sm ${notification.type === 'error' ? 'bg-red-500 text-white' :
                    notification.type === 'success' ? 'bg-green-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {notification.type === 'error' ? <AlertCircle size={20} /> :
                        notification.type === 'success' ? <Check size={20} /> :
                            <Info size={20} />}
                    <div>
                        <p className="font-bold text-sm">{notification.type === 'error' ? 'Error' : notification.type === 'success' ? 'Success' : 'Info'}</p>
                        <p className="text-sm opacity-90">{notification.message}</p>
                    </div>
                </div>
            )}

            <PageHeader
                title="Tickets"
                subtitle="Manage material requests and approvals."
                user={currentUser}
                profile={userProfile}
                bgColor="#164e63" // Cyan-900
            />

            {/* Realtime Status Indicator (Debug - Hidden) */}
            {/* Toolbar - Stats & Actions */}
            <div className="bg-primary-900 px-8 py-2 flex items-center justify-between border-t border-primary-800/50 shadow-md z-20">
                <div className="flex-1">
                    {headerStats}
                </div>
                <div className="flex justify-end gap-3">
                    {/* View Cancelled Toggle - Only for Toolroom/Supervisor/Admin(Toolroom View) */}
                    {(userProfile?.role === 'toolroom_staff' || userProfile?.role === 'supervisor' || (userProfile?.role === 'admin' && adminViewMode === 'toolroom')) && (
                        <button
                            onClick={() => setShowCancelledView(!showCancelledView)}
                            className={`px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg transition-colors text-sm border ${showCancelledView
                                ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                                : 'bg-white text-indigo-900 border-indigo-100 hover:bg-indigo-50'
                                }`}
                        >
                            <History size={16} strokeWidth={3} />
                            {showCancelledView ? 'Exit Cancelled View' : 'View Cancelled'}
                        </button>
                    )}

                    {/* New Request - Only for users and admin in user/admin view (NOT toolroom or supervisor) */}
                    {!(userProfile?.role === 'toolroom_staff' || userProfile?.role === 'supervisor' || (userProfile?.role === 'admin' && adminViewMode === 'toolroom')) && (
                        <button
                            onClick={() => {
                                setIsCreateModalOpen(true)
                                // Reset cart and filters when opening
                                setCartItems([])
                                setSearchDesc('')
                                setSearchPart('')
                                setFilterProcess('all')
                                setFilterArea('all')
                                setFilterMachine('all')
                            }}
                            className="bg-white text-primary-900 px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg hover:bg-slate-50 transition-colors text-sm"
                        >
                            <Plus size={16} strokeWidth={3} />
                            New Request
                        </button>
                    )}

                    {/* Requirement Status Button Removed - Consolidated into Item Actions */}

                    {/* Tool Room Staff Buttons - Only for toolroom staff, supervisor or admin in toolroom view */}
                    {(userProfile?.role === 'toolroom_staff' || userProfile?.role === 'supervisor' || (userProfile?.role === 'admin' && adminViewMode === 'toolroom')) && (
                        <>
                            <button
                                onClick={() => handleStartProcessing(selectedTicket)}
                                disabled={!selectedTicket || (selectedTicket.status !== 'pending' && selectedTicket.status !== 'PENDIENTE') || actionProcessingId === selectedTicket?.id}
                                className="bg-blue-500 text-white px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionProcessingId === selectedTicket?.id && selectedTicket?.status === 'PENDIENTE' ? <Loader2 size={16} className="animate-spin" /> : null}
                                {actionProcessingId === selectedTicket?.id && selectedTicket?.status === 'PENDIENTE' ? 'Starting...' : (selectedTicket ? `Start Processing #${selectedTicket.folio}` : 'Start Processing')}
                            </button>
                            <button
                                onClick={() => handleMarkReady(selectedTicket?.id)}
                                disabled={!selectedTicket || selectedTicket.status !== 'IN_PROCESS' || actionProcessingId === selectedTicket?.id}
                                className="bg-green-500 text-white px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionProcessingId === selectedTicket?.id && selectedTicket?.status === 'IN_PROCESS' ? <Loader2 size={16} className="animate-spin" /> : null}
                                {actionProcessingId === selectedTicket?.id && selectedTicket?.status === 'IN_PROCESS' ? 'Updating...' : 'Mark as Ready'}
                            </button>
                            <button
                                onClick={() => handleDeliverTicket(selectedTicket?.id)}
                                disabled={!selectedTicket || (selectedTicket.status !== 'READY' && selectedTicket.status !== 'PARTIALLY_FULFILLED') || actionProcessingId === selectedTicket?.id}
                                className="bg-purple-500 text-white px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg hover:bg-purple-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionProcessingId === selectedTicket?.id && (selectedTicket?.status === 'READY' || selectedTicket?.status === 'PARTIALLY_FULFILLED') ? <Loader2 size={16} className="animate-spin" /> : null}
                                {actionProcessingId === selectedTicket?.id && (selectedTicket?.status === 'READY' || selectedTicket?.status === 'PARTIALLY_FULFILLED') ? 'Delivering...' : 'Deliver'}
                            </button>

                        </>
                    )}
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
                        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleCloseRequirementModal}>
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
                                    <button onClick={handleCloseRequirementModal} className="text-primary-300 hover:text-white transition-colors">
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
                                        onClick={handleCloseRequirementModal}
                                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 shadow-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter Bar - Hide in cancelled view to keep it clean, or keep it if needed. Let's hide for table purity */}
                    {!showCancelledView && (
                        <div className="bg-blue-600/10 rounded-xl shadow-sm border border-blue-200 py-1 px-4 mb-4 flex gap-4 items-center backdrop-blur-sm -mt-2">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-slate-700">Status:</label>
                                <div className="flex bg-blue-50 p-1 rounded-xl shadow-inner gap-1 border border-blue-100">
                                    <button
                                        onClick={() => setStatusFilter('active')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${statusFilter === 'active'
                                            ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                            : 'bg-transparent text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'
                                            }`}
                                    >
                                        <Activity size={16} />
                                        Active
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('closed')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${statusFilter === 'closed'
                                            ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                                            : 'bg-transparent text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm'
                                            }`}
                                    >
                                        <CheckCircle size={16} />
                                        Finished
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${statusFilter === 'all'
                                            ? 'bg-slate-700 text-white shadow-md transform scale-105'
                                            : 'bg-transparent text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm'
                                            }`}
                                    >
                                        <List size={16} />
                                        All
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <label className="text-sm font-bold text-slate-700">Search Folio:</label>
                                <input
                                    type="text"
                                    value={folioSearch}
                                    onChange={(e) => setFolioSearch(e.target.value)}
                                    placeholder="Enter folio number..."
                                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
                                />
                                {folioSearch && (
                                    <button
                                        onClick={() => setFolioSearch('')}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {loading ? <p className="text-center text-slate-500 py-10">Loading tickets...</p> : (() => {

                        // CANCELLED TABLE VIEW
                        if (showCancelledView) {
                            // Flatten tickets to get all items with cancellation context
                            const cancelledItems = tickets.flatMap(ticket => {
                                return (ticket.items || []).filter(item => {
                                    const qualityReport = ticket.quality_reports?.find(qr => qr.material_id === item.material?.id);
                                    const isCancelled = item.status === 'cancelled' || item.item_status === 'cancelled' || ticket.status === 'CANCELLED';
                                    const hasReason = !!item.cancellation_reason || !!qualityReport;

                                    // Should show if specifically cancelled OR if ticket is cancelled
                                    // AND (important) it is actually cancelled (status or reason imply it)
                                    return (isCancelled && hasReason) || (item.status === 'cancelled') || (item.item_status === 'cancelled');
                                }).map(item => {
                                    const qualityReport = ticket.quality_reports?.find(qr => qr.material_id === item.material?.id);
                                    return {
                                        ...item,
                                        ticketFolio: ticket.folio,
                                        ticketDate: ticket.created_at,
                                        requester: ticket.requester,
                                        cancelledBy: item.canceller,
                                        cancellationReason: item.cancellation_reason || qualityReport?.description || 'Ticket Cancelled'
                                    }
                                })
                            }).filter(item => {
                                // Apply Filters
                                if (cancelledFilterFolio) {
                                    const cleanFilter = cancelledFilterFolio.toLowerCase().replace('#', '');
                                    if (!item.ticketFolio.toString().toLowerCase().includes(cleanFilter)) return false;
                                }
                                if (cancelledFilterMaterial) {
                                    const matSearch = cancelledFilterMaterial.toLowerCase();
                                    const matName = item.material?.name?.toLowerCase() || '';
                                    const matPart = item.material?.part_number?.toLowerCase() || '';
                                    if (!matName.includes(matSearch) && !matPart.includes(matSearch)) return false;
                                }
                                if (cancelledFilterRequester) {
                                    const reqSearch = cancelledFilterRequester.toLowerCase();
                                    const reqName = item.requester?.full_name?.toLowerCase() || '';
                                    const reqEmail = item.requester?.email?.toLowerCase() || '';
                                    if (!reqName.includes(reqSearch) && !reqEmail.includes(reqSearch)) return false;
                                }
                                if (cancelledFilterCancelledBy) {
                                    const cancSearch = cancelledFilterCancelledBy.toLowerCase();
                                    // Treat missing cancelledBy as 'unknown' for search purposes so users can find them
                                    const cancName = item.cancelledBy?.full_name?.toLowerCase() || 'unknown';
                                    const cancEmail = item.cancelledBy?.email?.toLowerCase() || '';

                                    if (!cancName.includes(cancSearch) && !cancEmail.includes(cancSearch)) return false;
                                }
                                if (cancelledFilterDate) {
                                    const dateStr = new Date(item.ticketDate).toLocaleDateString().toLowerCase();
                                    if (!dateStr.includes(cancelledFilterDate.toLowerCase())) return false;
                                }
                                return true;
                            }).sort((a, b) => new Date(b.ticketDate) - new Date(a.ticketDate));

                            const hasFilters = cancelledFilterFolio || cancelledFilterMaterial || cancelledFilterRequester || cancelledFilterCancelledBy || cancelledFilterDate;

                            if (cancelledItems.length === 0) {
                                return (
                                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                                            <Package size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700">No Cancelled Items Found</h3>
                                        <p className="text-slate-500 text-sm mt-1 mb-4">
                                            {hasFilters ? 'No items match your filter criteria.' : 'There are no items in the cancellation history.'}
                                        </p>

                                        {hasFilters && (
                                            <button
                                                onClick={() => {
                                                    setCancelledFilterFolio('');
                                                    setCancelledFilterMaterial('');
                                                    setCancelledFilterRequester('');
                                                    setCancelledFilterCancelledBy('');
                                                    setCancelledFilterDate('');
                                                }}
                                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                )
                            }

                            return (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                            <AlertCircle className="text-red-500" size={18} />
                                            Cancelled Items History
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {hasFilters && (
                                                <button
                                                    onClick={() => {
                                                        setCancelledFilterFolio('');
                                                        setCancelledFilterMaterial('');
                                                        setCancelledFilterRequester('');
                                                        setCancelledFilterCancelledBy('');
                                                        setCancelledFilterDate('');
                                                    }}
                                                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition-colors mr-2"
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                                                {cancelledItems.length} items
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                                    <th className="p-4 align-top w-28">
                                                        <div className="flex flex-col gap-2">
                                                            <span>Folio</span>
                                                            <input
                                                                type="text"
                                                                value={cancelledFilterFolio}
                                                                onChange={(e) => setCancelledFilterFolio(e.target.value)}
                                                                placeholder="#"
                                                                className="w-full text-[10px] p-1 border border-slate-200 rounded bg-white font-normal"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="p-4 align-top">
                                                        <div className="flex flex-col gap-2">
                                                            <span>Material</span>
                                                            <input
                                                                type="text"
                                                                value={cancelledFilterMaterial}
                                                                onChange={(e) => setCancelledFilterMaterial(e.target.value)}
                                                                placeholder="Part number or name"
                                                                className="w-full text-[10px] p-1 border border-slate-200 rounded bg-white font-normal"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="p-4 align-top">
                                                        <div className="flex flex-col gap-2">
                                                            <span>Requester</span>
                                                            <input
                                                                type="text"
                                                                value={cancelledFilterRequester}
                                                                onChange={(e) => setCancelledFilterRequester(e.target.value)}
                                                                placeholder="Name or email"
                                                                className="w-full text-[10px] p-1 border border-slate-200 rounded bg-white font-normal"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="p-4 align-top">
                                                        <div className="flex flex-col gap-2">
                                                            <span>Cancelled By</span>
                                                            <input
                                                                type="text"
                                                                value={cancelledFilterCancelledBy}
                                                                onChange={(e) => setCancelledFilterCancelledBy(e.target.value)}
                                                                placeholder="Name or email"
                                                                className="w-full text-[10px] p-1 border border-slate-200 rounded bg-white font-normal"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="p-4 align-top w-32">
                                                        <div className="flex flex-col gap-2">
                                                            <span>Date</span>
                                                            <input
                                                                type="text"
                                                                value={cancelledFilterDate}
                                                                onChange={(e) => setCancelledFilterDate(e.target.value)}
                                                                placeholder="DD/MM/YYYY"
                                                                className="w-full text-[10px] p-1 border border-slate-200 rounded bg-white font-normal"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="p-4 text-center align-middle">Qty</th>
                                                    <th className="p-4 align-middle">Cancellation Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {cancelledItems.map((item, idx) => (
                                                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-black text-slate-700 text-sm">#{item.ticketFolio}</td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-700 text-sm">{item.material?.name || 'Unknown'}</span>
                                                                <span className="font-mono text-slate-500 text-xs">{item.material?.part_number || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                                                    {item.requester?.email?.[0]?.toUpperCase() || 'U'}
                                                                </div>
                                                                <span className="text-sm text-slate-600">{item.requester?.full_name || item.requester?.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {item.cancelledBy ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">
                                                                        {item.cancelledBy?.email?.[0]?.toUpperCase() || 'S'}
                                                                    </div>
                                                                    <span className="text-sm text-slate-600">{item.cancelledBy?.full_name || item.cancelledBy?.email}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-slate-400 italic">Unknown</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-sm text-slate-500 font-mono">
                                                            {new Date(item.ticketDate).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-slate-700">{item.quantity_requested}</td>
                                                        <td className="p-4">
                                                            <span className="inline-block bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-medium border border-red-100 max-w-xs truncate" title={item.cancellationReason}>
                                                                {item.cancellationReason}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }

                        // STANDARD TICKET CARD VIEW (Existing Logic)
                        // Filter tickets based on status and folio search
                        const activeStatuses = ['pending', 'PENDIENTE', 'IN_PROCESS', 'READY', 'PARTIALLY_FULFILLED']
                        const closedStatuses = ['CLOSED', 'CANCELLED', 'ENTREGADO']

                        const filteredTickets = tickets.filter(ticket => {
                            // View mode filter
                            if (userProfile?.role === 'admin') {
                                // Admin in admin or user view - show only their own tickets
                                if (adminViewMode === 'admin' || adminViewMode === 'user') {
                                    if (ticket.requester_id !== currentUser?.id) return false
                                }
                                // Admin in toolroom view - show all tickets (no filter)
                            } else if (userProfile?.role === 'user') {
                                // Regular users - show only their own tickets
                                if (ticket.requester_id !== currentUser?.id) return false
                            }
                            // toolroom_staff - show all tickets (no filter)

                            // Status filter
                            if (statusFilter === 'active' && !activeStatuses.includes(ticket.status)) return false
                            if (statusFilter === 'closed' && !closedStatuses.includes(ticket.status)) return false

                            // Folio search - remove # symbol and make case-insensitive
                            if (folioSearch) {
                                const searchTerm = folioSearch.replace('#', '').trim()
                                const ticketFolio = ticket.folio.toString()
                                if (!ticketFolio.includes(searchTerm)) return false
                            }

                            return true
                        })

                        if (filteredTickets.length === 0) {
                            return <p className="text-center text-slate-500 py-10">No tickets found</p>
                        }

                        return filteredTickets.map(ticket => (

                            <div
                                key={ticket.id}
                                onClick={() => {
                                    if (userProfile?.role === 'toolroom_staff' || userProfile?.role === 'supervisor' || (userProfile?.role === 'admin' && adminViewMode === 'toolroom')) {
                                        setSelectedTicket(ticket)
                                        setNotification(null)
                                    }
                                }}
                                className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all cursor-pointer ${selectedTicket?.id === ticket.id
                                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30'
                                    : 'border-slate-200'
                                    }`}
                            >

                                <div className="flex-1 flex flex-col w-full">
                                    {/* Horizontal Header - 5 Columns, Side-by-Side Labels & Values */}
                                    <div className="grid grid-cols-5 items-center w-full bg-indigo-50 rounded-lg py-2 px-4 mb-2 border border-indigo-100 gap-2">
                                        {/* Folio */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Folio:</span>
                                            <span className="text-sm font-black text-slate-700">#{ticket.folio || '---'}</span>
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                                            <div className={`px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 border shadow-sm ${['PENDIENTE', 'pending', 'PENDING'].includes(ticket.status)
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${['PENDIENTE', 'pending', 'PENDING'].includes(ticket.status) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                                <span className="font-extrabold text-[9px] uppercase tracking-wide">{ticket.status}</span>
                                            </div>
                                        </div>

                                        {/* User */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By:</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-black border border-indigo-200">
                                                    {ticket.requester?.avatar_url
                                                        ? <img src={ticket.requester.avatar_url} className="w-full h-full object-cover rounded-full" />
                                                        : (ticket.requester?.email?.[0]?.toUpperCase() || 'U')}
                                                </div>
                                                <span className="font-bold text-slate-600 text-[10px] truncate max-w-[80px]">{ticket.requester?.full_name || ticket.requester?.email || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date:</span>
                                            <div className="flex items-center gap-1 text-slate-600">
                                                <span className="text-[10px] font-bold font-mono">
                                                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '---'}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Requested Items Summary (Moved to Header) */}
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items:</span>
                                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">{ticket.items?.length || 0}</span>
                                        </div>
                                    </div>

                                    {/* Full Width Requested Items List */}
                                    <div className="flex-1">
                                        {/* Header removed as it's now in main header row */}

                                        <div className="space-y-2">
                                            {ticket.items?.map((item, idx) => {
                                                const isTicketClosed = ['CLOSED', 'ENTREGADO', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(ticket.status?.toUpperCase());
                                                const isLowStock = isItemLowStock(item.material) && !isTicketClosed;
                                                const isSelected = selectedTicketItem?.id === item.id;

                                                // Conditional styling for the item row
                                                let rowClass = "flex items-center justify-between p-3 rounded-lg border transition-all text-sm group ";
                                                if (isSelected) {
                                                    rowClass += "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100";
                                                } else if (isLowStock) {
                                                    rowClass += "bg-red-50 border-red-200 cursor-pointer hover:bg-red-100/80";
                                                } else {
                                                    rowClass += "bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed"; // Reduced interactivity for normal items
                                                }
                                                // Find matching quality report for this item (Legacy fallback)
                                                const qualityReport = ticket.quality_reports?.find(qr => qr.material_id === item.material?.id);
                                                const effectiveCancellationReason = item.cancellation_reason || qualityReport?.description;
                                                const isLegacyCancelled = !!qualityReport && ticket.status === 'CANCELLED';

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={rowClass}
                                                        onClick={() => handleItemClick(item)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${isLowStock ? 'bg-red-100 text-red-600' : 'bg-white text-slate-400 shadow-sm'
                                                                }`}>
                                                                {isLowStock ? <AlertTriangle size={16} /> : <Box size={16} />}
                                                            </div>
                                                            <div className="flex gap-8 items-start">
                                                                {/* Material Info Column */}
                                                                <div>
                                                                    <p className={`font-bold ${isLowStock ? 'text-red-700' : 'text-slate-700'}`}>
                                                                        {item.material?.name || 'Unknown Item'}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="text-xs text-slate-500 font-mono">
                                                                            {item.material?.part_number || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* PPE Recipient Info Column - Aligned Row-wise */}
                                                                {(ticket.employee_number || ticket.operator_name) && (
                                                                    <div className="flex flex-col border-l border-slate-200 pl-4">
                                                                        {/* Row 1: ID aligned with Material Name */}
                                                                        <div className="flex items-center gap-2 h-[24px]">
                                                                            <span className="text-xs uppercase font-bold text-slate-400 w-8">Id</span>
                                                                            <span className="font-bold text-slate-700 text-sm">
                                                                                {ticket.employee_number}
                                                                            </span>
                                                                        </div>
                                                                        {/* Row 2: Name aligned with Part Number */}
                                                                        <div className="flex items-center gap-2 h-[16px]">
                                                                            <span className="text-xs uppercase font-bold text-slate-400 w-14">Nombre</span>
                                                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate max-w-[150px]">
                                                                                {ticket.operator_name}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {isLowStock && (
                                                                <>
                                                                    <span className="inline-flex items-center gap-1 text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                                        Low Stock: {item.material?.current_stock}
                                                                    </span>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedTicketItem(item);

                                                                            // Check for Active Requisition before opening report modal
                                                                            try {
                                                                                // Step A: Find Requisition IDs associated with this material
                                                                                const { data: itemData, error: itemError } = await supabase
                                                                                    .from('requisition_items')
                                                                                    .select('requisition_id')
                                                                                    .eq('material_id', item.material?.id)
                                                                                    .limit(5)

                                                                                if (!itemError && itemData && itemData.length > 0) {
                                                                                    const reqIds = itemData.map(i => i.requisition_id).filter(Boolean)

                                                                                    if (reqIds.length > 0) {
                                                                                        // Step B: Fetch full details for these requisitions
                                                                                        const { data: reqs, error: reqError } = await supabase
                                                                                            .from('requisitions')
                                                                                            .select(`
                                                                                                *,
                                                                                                items:requisition_items (*),
                                                                                                approvals:requisition_approvals (*)
                                                                                            `)
                                                                                            .in('id', reqIds)
                                                                                            .order('created_at', { ascending: false })

                                                                                        if (!reqError && reqs) {
                                                                                            // Check for any active status
                                                                                            const activeReq = reqs.find(r => !['DRAFT', 'CANCELED', 'REJECTED_FINAL', 'CANCELLED', 'CLOSED', 'REJECTED', 'PARTIALLY_RECEIVED'].includes(r.status))

                                                                                            if (activeReq) {
                                                                                                // Fetch requester profile
                                                                                                const { data: profile } = await supabase
                                                                                                    .from('profiles')
                                                                                                    .select('*')
                                                                                                    .eq('id', activeReq.requester_id)
                                                                                                    .single()

                                                                                                if (profile) activeReq.requester = profile

                                                                                                setViewingRequisition(activeReq)
                                                                                                setIsRequisitionDetailOpen(true)
                                                                                                return
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            } catch (e) {
                                                                                console.error("Error checking requisitions:", e)
                                                                            }

                                                                            setIsRequirementModalOpen(true);
                                                                        }}
                                                                        className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-red-700 transition-colors animate-pulse"
                                                                    >
                                                                        <FileText size={10} />
                                                                        REPORT / REQ
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                        {
                                                            (item.status === 'cancelled' || item.item_status === 'cancelled' || isLegacyCancelled || effectiveCancellationReason) && (
                                                                <div className="mt-1.5 flex items-start gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                                                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-black uppercase tracking-wider leading-none mb-0.5">Cancelled</span>
                                                                        <span className="text-xs leading-tight">{effectiveCancellationReason || 'No reason provided'}</span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {/* Quantity Badge - Inside Main Row, aligned right */}
                                                        <div className="ml-auto flex flex-col items-center justify-center bg-white px-3 py-2 rounded shadow-sm border border-slate-100 min-h-[60px]">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qty</span>
                                                            <span className="text-base font-black text-slate-700 mt-auto">{item.quantity_requested}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>

                                </div>



                                {(ticket.status === 'CLOSED' || ticket.status === 'ENTREGADO') && (
                                    <div className="md:w-40 flex flex-col justify-center animate-in fade-in pl-4 border-l border-slate-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleOpenQualityReport(ticket)
                                            }}
                                            className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2 shadow-sm transition-colors"
                                        >
                                            <AlertTriangle size={16} />
                                            Report Issue
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    })()}
                </div >
            </div >

            {/* NEW Redesigned Modal - Full Screen / Large */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 backdrop-blur-sm" onClick={handleCloseModal}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>

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
                                <div className="w-[78%] flex flex-col border-r border-slate-200 bg-slate-50/50">
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
                                                        <Search size={12} /> VERIFY
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
                                                    <label className="font-normal text-slate-600 text-xs w-20 text-right">Category:</label>
                                                    <select
                                                        className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                        value={filterCategory}
                                                        onChange={e => {
                                                            if (checkPendingAction()) return
                                                            setFilterCategory(e.target.value)
                                                        }}
                                                    >
                                                        <option value="all">- Select -</option>
                                                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2">
                                                    <label className="font-normal text-slate-600 text-xs w-20 text-right">Type:</label>
                                                    <select
                                                        className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none text-slate-600 font-light bg-white"
                                                        value={filterType}
                                                        onChange={e => {
                                                            if (checkPendingAction()) return
                                                            setFilterType(e.target.value)
                                                        }}
                                                    >
                                                        <option value="all">- Select -</option>
                                                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
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
                                                    setFilterCategory('all')
                                                    setFilterType('all')
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
                                    <div className="flex-1 overflow-auto custom-scrollbar">
                                        <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                                            <thead>
                                                <tr>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[12%]">Part #</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[20%]">Description</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[10%]">Category</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[10%]">Type</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[12%]">Process</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[8%]">Area</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-left text-xs font-bold text-primary-800 uppercase tracking-wider w-[8%]">Machine</th>
                                                    <th className="p-3 border-b border-primary-200 text-center sticky top-0 z-50 bg-primary-100 text-xs font-bold text-primary-800 uppercase tracking-wider w-[5%]">Stock</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-center text-xs font-bold text-primary-800 uppercase tracking-wider w-[8%]">Qty</th>
                                                    <th className="p-3 border-b border-primary-200 sticky top-0 z-50 bg-primary-100 text-center text-xs font-bold text-primary-800 uppercase tracking-wider w-[7%]">Action</th>
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
                                                                <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-sm text-slate-500 ${cellBg}`}>{material.category || '-'}</td>
                                                                <td className={`p-3 border-b ${isLowStock ? 'border-red-100' : 'border-slate-100'} text-sm text-slate-500 ${cellBg} capitalize`}>
                                                                    {material.material_type?.replace('_', ' ') || '-'}
                                                                </td>
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
                                                                        onChange={e => {
                                                                            // Check for pending actions first
                                                                            if (checkPendingAction()) return

                                                                            // Set the quantity for this material
                                                                            setQtyInputs({ [material.id]: e.target.value })
                                                                        }}
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
                                                        <td colSpan="10" className="p-8 text-center text-slate-400">
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
                                <div className="w-[22%] flex flex-col bg-slate-50 border-l border-slate-200">
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
                )
            }

            {/* Processing Modal - Tool Room Staff */}
            {
                isProcessingModalOpen && processingTicket && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="bg-primary-900 px-6 py-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Processing Ticket #{processingTicket.folio}</h2>
                                    <p className="text-primary-200 text-sm">User: {processingTicket.requester?.full_name || 'Unknown'}</p>
                                </div>
                                <button
                                    onClick={handleCancelProcessingSession}
                                    className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-auto p-6 space-y-4">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Items to Process:</h3>

                                {processingTicket.items?.map(item => {
                                    const itemStatus = itemStatuses[item.id]?.status || 'pending'
                                    const material = item.material
                                    const isLowStock = material?.current_stock <= (material?.min_stock || 0)

                                    return (
                                        <div
                                            key={item.id}
                                            className={`border-2 rounded-lg p-4 transition-all ${itemStatus === 'fulfilled' ? 'bg-green-50 border-green-500' :
                                                itemStatus === 'cancelled' ? 'bg-red-50 border-red-500' :
                                                    'bg-white border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                {/* Material Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Package className={itemStatus === 'fulfilled' ? 'text-green-600' : itemStatus === 'cancelled' ? 'text-red-600' : 'text-slate-600'} size={20} />
                                                        <h4
                                                            className="font-bold text-slate-800 cursor-pointer hover:text-primary-600 transition-colors"
                                                            onClick={() => handleViewItemImage(material)}
                                                            title="Click to view image"
                                                        >
                                                            {material?.name || 'Unknown Material'}
                                                        </h4>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium">Part #:</span>
                                                            <span className="font-mono">{material?.part_number}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <MapPin size={14} />
                                                            <span className="font-medium">Location:</span>
                                                            <span>{material?.location || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Box size={14} />
                                                            <span className="font-medium">Stock:</span>
                                                            <span className={isLowStock ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                                                                {material?.current_stock || 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium">Requested:</span>
                                                            <span className="font-bold text-primary-600">{item.quantity_requested}</span>
                                                        </div>
                                                    </div>

                                                    {material?.description && (
                                                        <p className="text-xs text-slate-500 italic">{material.description}</p>
                                                    )}

                                                    {itemStatus === 'cancelled' && itemStatuses[item.id]?.reason && (
                                                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                                                            <span className="font-bold">Reason:</span> {itemStatuses[item.id].reason}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col gap-2">
                                                    {itemStatus === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleFulfillItem(item.id)}
                                                                className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-bold shadow hover:bg-green-600 transition-all text-sm"
                                                            >
                                                                <Check size={16} />
                                                                Fulfill
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelItem(item.id)}
                                                                className="bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-bold shadow hover:bg-red-600 transition-all text-sm"
                                                            >
                                                                <X size={16} />
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                    {itemStatus === 'fulfilled' && (
                                                        <div className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-bold text-sm">
                                                            <Check size={16} />
                                                            Fulfilled
                                                        </div>
                                                    )}
                                                    {itemStatus === 'cancelled' && (
                                                        <div className="bg-red-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-bold text-sm">
                                                            <X size={16} />
                                                            Cancelled
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Modal Footer */}
                            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center">
                                <button
                                    onClick={handleCancelProcessingSession}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFinishProcessing}
                                    disabled={Object.values(itemStatuses).some(item => item.status === 'pending')}
                                    className="bg-primary-600 text-white px-6 py-2 rounded-md font-bold shadow-lg hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check size={18} />
                                    Finish Processing
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Material Image Modal */}
            {
                viewingImageMaterial && (
                    <div
                        className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setViewingImageMaterial(null)}
                    >
                        <div className="bg-white p-4 rounded-xl max-w-3xl max-h-[90vh] overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setViewingImageMaterial(null)}
                                className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg z-10"
                            >
                                <X size={20} />
                            </button>
                            {viewingImageMaterial.signed_image_url ? (
                                <img
                                    src={viewingImageMaterial.signed_image_url}
                                    alt={viewingImageMaterial.name}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                                    <Image size={64} />
                                    <p className="mt-4 text-lg">No image available</p>
                                </div>
                            )}
                            <div className="mt-3 text-center">
                                <p className="font-bold text-lg text-slate-800">{viewingImageMaterial.name}</p>
                                <p className="text-sm text-slate-500">{viewingImageMaterial.part_number}</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cancellation Reason Modal */}
            {
                cancelModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                            <div className="bg-red-600 px-6 py-4 rounded-t-xl relative">
                                <h3 className="text-xl font-bold text-white">Cancel Item</h3>
                                <button
                                    onClick={() => {
                                        setCancelModalOpen(false)
                                        setCancellingItemId(null)
                                        setCancellationReason('')
                                    }}
                                    className="absolute top-4 right-4 text-white hover:text-red-100 transition-colors"
                                    title="Close"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Reason for cancellation:
                                </label>
                                <textarea
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    placeholder="Enter reason (e.g., No authorization, Out of stock, etc.)"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    rows={4}
                                    autoFocus
                                />
                            </div>
                            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                                {/* Report Quality Issue Button - Left side */}
                                <button
                                    onClick={() => {
                                        // Find the ticket that contains this item
                                        const ticket = tickets.find(t =>
                                            t.items?.some(item => item.id === cancellingItemId)
                                        )
                                        if (ticket) {
                                            setCancelModalOpen(false)
                                            handleOpenQualityReport(ticket, 'processing')
                                        }
                                    }}
                                    className="bg-orange-500 text-white px-3 py-1.5 rounded-md font-bold shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2 text-sm"
                                >
                                    <AlertTriangle size={14} />
                                    Report Quality Issue
                                </button>

                                {/* Confirm Cancellation button - Right side */}
                                <button
                                    onClick={confirmCancelItem}
                                    className="bg-red-600 text-white px-4 py-1.5 rounded-md font-bold shadow-lg hover:bg-red-700 transition-all text-sm"
                                >
                                    Confirm Cancellation
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quality Report Modal */}
            {
                isQualityReportModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-orange-200 bg-orange-500 rounded-t-xl relative">
                                <button
                                    onClick={() => setIsQualityReportModalOpen(false)}
                                    className="absolute top-4 right-4 text-white hover:text-orange-100 transition-colors"
                                    title="Close"
                                >
                                    <X size={24} />
                                </button>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="text-white" size={24} />
                                    Report Quality Issue
                                </h2>
                                <p className="text-sm text-orange-100 mt-1">
                                    Report material quality issues for ticket #{reportingTicket?.folio}
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Material Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Select Material <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedMaterialForReport?.material_id || ''}
                                        onChange={(e) => {
                                            const item = reportingTicket.items.find(i => i.material_id === parseInt(e.target.value))
                                            setSelectedMaterialForReport(item)
                                            // Auto-fill supplier name if material has one registered
                                            if (item?.material?.supplier) {
                                                setSupplierName(item.material.supplier)
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">-- Select Material --</option>
                                        {reportingTicket?.items?.map(item => (
                                            <option key={item.id} value={item.material_id}>
                                                {item.material?.part_number} - {item.material?.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Issue Category */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Issue Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={issueCategory}
                                        onChange={(e) => setIssueCategory(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">-- Select Category --</option>
                                        <option value="wrong_material">Wrong Material (Incorrect Part)</option>
                                        <option value="damaged">Damaged (Physical Damage)</option>
                                        <option value="wrong_quantity">Wrong Quantity (Count Mismatch)</option>
                                        <option value="defective">Defective (Quality Defect)</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={issueDescription}
                                        onChange={(e) => setIssueDescription(e.target.value)}
                                        placeholder="Describe the quality issue in detail..."
                                        rows={4}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                {/* Supplier Name */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Supplier Name {selectedMaterialForReport?.material?.supplier ? '(Auto-filled from material)' : '(Optional - Enter manually)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        placeholder={selectedMaterialForReport?.material?.supplier ? "Supplier from material record" : "Enter supplier name if known..."}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    {selectedMaterialForReport?.material?.supplier && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Supplier registered in material master
                                        </p>
                                    )}
                                </div>

                                {/* Quantity Affected */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Quantity Affected (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        value={quantityAffected}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const max = selectedMaterialForReport?.quantity_requested ||
                                                reportingTicket?.items?.find(i => i.material_id === selectedMaterialForReport?.material_id)?.quantity_requested ||
                                                9999;
                                            if (val > max) {
                                                // Prevent setting value higher than max immediately
                                                // or just let the max attribute handle the invalid state visual
                                            }
                                            setQuantityAffected(e.target.value)
                                        }}
                                        placeholder="How many units were affected?"
                                        min="1"
                                        max={selectedMaterialForReport?.quantity_requested || reportingTicket?.items?.find(i => i.material_id === selectedMaterialForReport?.material_id)?.quantity_requested}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 invalid:border-red-500 invalid:text-red-600 focus:invalid:ring-red-500"
                                    />
                                </div>

                                {/* Action Taken */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Action Taken
                                    </label>
                                    <select
                                        value={actionTaken}
                                        onChange={(e) => setActionTaken(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="pending_review">Pending Review</option>
                                        <option value="rejected">Rejected (Not Accepted)</option>
                                        <option value="returned">Returned to Supplier</option>
                                        <option value="accepted_with_note">Accepted with Note</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsQualityReportModalOpen(false)}
                                    className="px-6 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitQualityReport}
                                    className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-orange-600 transition-all"
                                >
                                    Submit Report
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reports List Modal */}
            {
                isReportListModalOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setIsReportListModalOpen(false)}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 bg-purple-900 text-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 p-2 rounded-lg">
                                        <FileWarning size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">Material Reports</h3>
                                        <p className="text-purple-200 text-xs">Select items to create a requisition (Max 6)</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsReportListModalOpen(false)} className="text-purple-300 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-0">
                                {reports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                        <Check size={48} className="mb-2 opacity-50" />
                                        <p>No active reports found.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 font-bold w-10 text-center">
                                                    {/* Select All could go here but might be safer manual for now */}
                                                </th>
                                                <th className="px-6 py-3 font-bold">Date</th>
                                                <th className="px-6 py-3 font-bold">Material</th>
                                                <th className="px-6 py-3 font-bold">Reported By</th>
                                                <th className="px-6 py-3 font-bold">Message</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {reports.map((report) => {
                                                const isSelected = selectedReports.includes(report.id)
                                                return (
                                                    <tr
                                                        key={report.id}
                                                        className={`transition-colors cursor-pointer ${isSelected ? 'bg-purple-50' : 'bg-white hover:bg-slate-50'}`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedReports(selectedReports.filter(id => id !== report.id))
                                                            } else {
                                                                if (selectedReports.length >= 6) {
                                                                    showNotification("Maximum 6 items per requisition.", "error")
                                                                    return
                                                                }
                                                                setSelectedReports([...selectedReports, report.id])
                                                            }
                                                        }}
                                                    >
                                                        <td className="px-4 py-4 text-center">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                                                                {isSelected && <Check size={12} className="text-white" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-slate-500">
                                                            {new Date(report.created_at).toLocaleDateString('en-US')}
                                                            <br />
                                                            {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-700">{report.material?.name}</div>
                                                            <div className="text-xs font-mono text-slate-500">{report.material?.part_number}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                                    {report.sender?.full_name?.[0] || 'U'}
                                                                </div>
                                                                <span className="text-slate-600 font-medium truncate max-w-[120px]">
                                                                    {report.sender?.full_name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={report.message}>
                                                            {report.message}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                <div className="text-sm font-medium text-slate-500">
                                    {selectedReports.length} selected
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsReportListModalOpen(false)}
                                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 shadow-sm"
                                    >
                                        Close
                                    </button>
                                    <button
                                        disabled={selectedReports.length === 0}
                                        onClick={() => {
                                            const selectedItems = reports.filter(r => selectedReports.includes(r.id))
                                            const reqItems = selectedItems.map(report => ({
                                                material_id: report.material_id,
                                                quantity: 1, // Default
                                                // Try to resolve keys if they differ
                                                unit: report.material?.unit_of_measure || report.material?.unit || 'EA',
                                                notes: `Reported issue: ${report.message || 'Low Stock'}`
                                            }))
                                            setInitialRequisitionItems(reqItems)
                                            setIsCreateRequisitionModalOpen(true)
                                            setIsReportListModalOpen(false) // Close reports modal
                                        }}
                                        className="px-4 py-2 bg-purple-600 text-white font-bold text-sm rounded-lg hover:bg-purple-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Create Requisition
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Requisition Create Modal (Launched from Reports) */}
            <RequisitionFormModal
                isOpen={isCreateRequisitionModalOpen}
                onClose={() => {
                    setIsCreateRequisitionModalOpen(false)
                    setInitialRequisitionItems([])
                    setSelectedReports([])
                }}
                onSuccess={handleRequisitionSuccess}
                materials={materials.reduce((acc, m) => ({ ...acc, [m.id]: m }), {})} // Map array to object for modal
                initialItems={initialRequisitionItems}
                currentUser={userProfile}
                users={users}
            />

            {/* Requisition Detail Modal (Read-Only Mode) */}
            {
                isRequisitionDetailOpen && (
                    <RequisitionDetailModal
                        isOpen={isRequisitionDetailOpen}
                        onClose={() => {
                            setIsRequisitionDetailOpen(false)
                            setViewingRequisition(null)
                        }}
                        requisition={viewingRequisition}
                        materials={materials.reduce((acc, mat) => ({ ...acc, [mat.id]: mat }), {})}
                        usersMap={undefined}
                        currentUser={currentUser}
                        onActionSuccess={() => { }}
                    />
                )
            }

            {/* PPE Validation Modal */}
            <PPEValidationModal
                isOpen={isPPEModalOpen}
                onClose={() => setIsPPEModalOpen(false)}
                onConfirm={(employeeNumber, operatorName, renewalDates) => processTicketSubmission({ employeeNumber, operatorName, renewalDates })}
                eppItems={ppeItems}
            />
            {/* PPE Block/History Modal */}
            <PPEBlockModal
                isOpen={blockModalData.isOpen}
                onClose={() => setBlockModalData(prev => ({ ...prev, isOpen: false }))}
                blockedItems={blockModalData.blockedItems}
                employeeNumber={blockModalData.employeeNumber}
                operatorName={blockModalData.operatorName}
                history={blockModalData.history}
                newRenewalDates={blockModalData.renewalDates}
                onRestock={handleRestock}
            />
        </div >
    )
}

export default function Tickets() {
    return (
        <ErrorBoundary>
            <TicketsContent />
        </ErrorBoundary>
    )
}

