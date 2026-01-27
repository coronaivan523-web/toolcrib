
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import {
    ArrowLeft, Save, X, Search, Filter,
    Check, AlertTriangle, Calendar, User, Image as ImageIcon,
    MoreHorizontal, Plus, Trash2, EyeOff, CheckCircle, Lock, Minus, Clock, AlertCircle, RotateCcw
} from 'lucide-react'
import { cycleCountService } from '../../services/cycleCounts'
import { materialService } from '../../services/materials'
import { requisitionService } from '../../services/requisitions'
import { useToast } from '../../context/ToastContext'
import Button from '../../components/ui/Button'
import clsx from 'clsx'
import { format } from 'date-fns'
// REMOVED: import MaterialHistoryView from '../../components/MaterialHistoryView'
// REMOVED: import CycleCountItemDetailModal from '../../components/CycleCountItemDetailModal'

// Lazy Loads
const CycleCountItemDetailModal = lazy(() => import('../../components/CycleCountItemDetailModal'))
const ConfirmationModal = lazy(() => import('../../components/ConfirmationModal'))
const MaterialHistoryView = lazy(() => import('../../components/MaterialHistoryView'))
const CycleCountHistoryModal = lazy(() => import('../../components/CycleCountHistoryModal'))

export default function CycleCountDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const { userProfile } = useOutletContext() || {} // Safety check if context is missing

    // Data State
    const [session, setSession] = useState(null)
    const [materials, setMaterials] = useState([])
    const [users, setUsers] = useState([])
    const [loadingSession, setLoadingSession] = useState(false)
    const [loadingCatalog, setLoadingCatalog] = useState(false)

    // Filter State
    const [filters, setFilters] = useState({
        part_number: '',
        description: '',
        factory: '',
        location: '',
        process: '',
        area: '',
        machine: '',
        action: 'all' // Explicit default to show ALL items (Pending + Closed)
    })

    // Selection/Assignment State
    const [assignedUser, setAssignedUser] = useState('')
    const [plannedDate, setPlannedDate] = useState('')
    const [isSelectionEnabled, setIsSelectionEnabled] = useState(false)
    const [ticketItems, setTicketItems] = useState({}) // { materialId: materialObj } for fast lookup
    const [saving, setSaving] = useState(false)
    // REMOVED: cumulativeLines (User requested DB-only flow)
    const [showCriticalStock, setShowCriticalStock] = useState(false) // Toggle for low stock filter

    // Counting Mode State (for toolroom staff)
    const [selectedMaterialForCount, setSelectedMaterialForCount] = useState(null) // Material being counted
    const [countingQty, setCountingQty] = useState('') // Quantity being entered
    const [previewImage, setPreviewImage] = useState(null) // Image URL to preview

    // History Search State (Supervisor)
    const [historySearchItem, setHistorySearchItem] = useState(null) // Selected item for search
    const [showHistoryModal, setShowHistoryModal] = useState(false) // Show full history view
    const historyTimerRef = React.useRef(null)

    // Modal States
    const [confirmResetModal, setConfirmResetModal] = useState({ isOpen: false, items: [] })

    // Item Detail Popup State
    const [itemDetail, setItemDetail] = useState(null)

    // Adjustment / Validation Mode State (Supervisor)
    const [adjustmentItem, setAdjustmentItem] = useState(null) // Material being adjusted
    const [adjustmentQty, setAdjustmentQty] = useState('') // New Stock Quantity (editable)
    const [showConfirmModal, setShowConfirmModal] = useState(false) // Double confirmation

    // Use a ref for current ID to handle the switch from 'new' to 'uuid' without race conditions in closures
    const idRef = React.useRef(id)
    useEffect(() => { idRef.current = id }, [id])

    // GLOBAL STATUS: Load all previously saved lines from localStorage to show "Saved" status
    // even when starting a "New" session or returning from index.
    // GLOBAL STATUS: Load all previously saved lines from localStorage to show "Saved" status
    // REMOVED: Simulation mode logic
    // GLOBAL STATUS: Load all previously saved lines from localStorage to show "Saved" status
    // REMOVED: Simulation mode logic

    // --- DATA LOADING ---
    const fetchUsers = async () => {
        console.time('LoadUsers')
        try {
            // Filter users to show ONLY Toolroom Staff
            const usersData = await requisitionService.getUsers()
            // Load ALL users to state so we can resolve names for Admins/Supervisors in the table
            // We will filter the "Assign To" dropdown locally.
            setUsers(usersData || [])
        } catch (error) {
            console.error("Users Load Error:", error)
        } finally {
            console.timeEnd('LoadUsers')
        }
    }

    const fetchSession = async () => {
        if (id === 'new') {
            setAssignedUser('')
            setPlannedDate('')

            // NEW: Fetch ALL Active/Pending lines to show what is already assigned
            try {
                const activeLines = await cycleCountService.getActiveLines()
                // setSession with these lines so they appear in the table
                // We mock a session object
                setSession({
                    id: 'new',
                    lines: activeLines || []
                })
            } catch (err) {
                console.error("Failed to load active lines", err)
            }

            setLoadingSession(false)
            return
        }

        console.time('LoadSession')
        try {
            setLoadingSession(true)
            let sessionData;

            // Check if it's a simulated session FIRST (either sim- prefix or C-prefix sequential IDs)
            // REMOVED: Simulation check. Strictly usage of API.
            sessionData = await cycleCountService.getSessionById(id)

            if (sessionData) {
                setSession(sessionData)
                if (sessionData.assigned_to) setAssignedUser(sessionData.assigned_to)
                if (sessionData.planned_date) setPlannedDate(sessionData.planned_date)
            }
        } catch (error) {
            console.error("Session Load Error:", error)
            toast.error("Failed to load session info")
        } finally {
            setLoadingSession(false)
            console.timeEnd('LoadSession')
        }
    }

    const fetchCatalog = async () => {
        console.time('LoadCatalog')
        setLoadingCatalog(true)
        try {
            const data = await materialService.getCatalog()
            setMaterials(data || [])
        } catch (error) {
            console.error("Error fetching catalog:", error)
            toast.error("Failed to load material catalog")
            setMaterials([])
        } finally {
            setLoadingCatalog(false)
            console.timeEnd('LoadCatalog')
        }
    }

    useEffect(() => {
        // Trigger all fetches in parallel independently
        fetchUsers()
        fetchSession()
        fetchCatalog()

        // RESET FILTERS on Session Change to ensure no "hidden" items from previous navigation
        setFilters(prev => ({
            part_number: '',
            description: '',
            factory: '',
            location: '',
            process: '',
            area: '',
            machine: '',
            user: '',
            planned_date: '', // New Filter
            real_date: '',     // New Filter
            adjustment: 'all',
            action: 'all'
        }))
        setShowCriticalStock(false)
    }, [id])

    // SIMULATED RESET: Removed to fix bug where viewing an existing 'sim-' session would auto-clear it.
    // We only want to clear if explicitly requested or creating new.

    const handleEnableSelection = () => {
        if (!assignedUser || !plannedDate) {
            toast.error("Please select a User and Planned Date first")
            return
        }

        // Validate Future Date (Tomorrow onwards)
        const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]
        if (plannedDate < minDate) {
            toast.error("Invalid date. Only future dates (tomorrow onwards) are allowed.")
            return
        }

        setIsSelectionEnabled(true)
        toast.success("Ready to add items to ticket")
    }

    const handleToggleItem = (material) => {
        // [MODIFIED] Allow selection even if already in linesMap (active), 
        // to enable the "RE-COUNT" (Reset Status) workflow.
        // Prevention of duplicates happens in handleSaveTicket.

        /* 
        if (linesMap[material.id]) {
            // Original Block
            return
        } 
        */

        // REMOVED: Restriction that forced User/Date selection before toggling.
        // We now allow "Selection Mode" freely to enable workflows like Reset Status.
        // Validation for User/Date is moved to 'handleSaveTicket' (ACCEPT).

        // Auto-enable selection visual state if not already (Optional, but keeps UI consistent)
        // Actually, let's keep isSelectionEnabled as a "Locked Session Config" indicator.
        // If we select items without locking config, that's fine.
        /*
        if (!isSelectionEnabled) {
            // ... Logic removed ...
        }
        */

        setTicketItems(prev => {
            const next = { ...prev }
            if (next[material.id]) {
                delete next[material.id]
            } else {
                next[material.id] = material
            }
            return next
        })
    }

    const handleSelectAll = (e) => {
        // If checked, add all filtered, otherwise clear filtered
        const checked = e.target.checked
        const newItems = { ...ticketItems }

        if (checked) {
            filteredMaterials.forEach(item => {
                newItems[item.id] = item
            })
            // Toast summary
            toast.success(`Selected ${filteredMaterials.length} items`)
        } else {
            // Toggle OFF: We only remove visible items (to respect other filters if active?) 
            // OR just remove everything visible.
            // Requirement says: "si hay un filtro aplicado que marque solo lo de lo de el filtro aplicado si se le da click cuando haya recuadros marcados que los desmarque"
            filteredMaterials.forEach(item => {
                delete newItems[item.id]
            })
        }
        setTicketItems(newItems)
    }

    const handleCancelTicket = () => {
        setTicketItems({})
        setIsSelectionEnabled(false)
        setAssignedUser('')
        setPlannedDate('')
        toast.info("Ticket cancelled")
    }

    const handleHideCatalog = () => {
        const hasItems = Object.keys(ticketItems).length > 0
        if (hasItems) {
            // Simple confirm via browser or toast? Browser confirm is reliable.
            if (!window.confirm("You have unsaved items selected. Are you sure you want to exit?")) {
                return
            }
        }
        navigate('/cycle-counts')
    }

    const handleClearFilters = () => {
        setFilters({
            part_number: '',
            description: '',
            factory: '',
            location: '',
            process: '',
            area: '',
            machine: '',
            adjustment: 'all'
        })
        setShowCriticalStock(false)
    }

    // Counting Mode Handlers
    const handleOpenCountPanel = async (material) => {
        // SECURITY: Check if item is already counted
        const line = linesMap[material.id]
        if (line?.qty_physical !== undefined && line?.qty_physical !== null) {
            toast.error("This item has already been counted. Modification is restricted.", {
                icon: <Lock size={16} className="text-red-500" />
            })
            return
        }

        // 1. Optimistic Open (Show panel immediately with list data)
        setSelectedMaterialForCount(material)
        setCountingQty(line?.qty_physical ?? '')

        // 2. Background Fetch for Full Details (Image)
        try {
            const fullDetails = await materialService.getById(material.id)
            if (fullDetails && fullDetails.image_url) {
                // Merge details into current view
                setSelectedMaterialForCount(prev => {
                    // Safety check: ensure user didn't close or switch panel
                    if (!prev || prev.id !== material.id) return prev
                    return { ...prev, ...fullDetails }
                })
            }
        } catch (error) {
            console.error("Failed to load material details:", error)
        }
    }

    const handleCloseCountPanel = () => {
        setSelectedMaterialForCount(null)
        setCountingQty('')
    }

    const handleSaveCount = async () => {
        if (!selectedMaterialForCount || countingQty === '') {
            toast.error('Please enter a quantity')
            return
        }

        try {
            const qty = parseInt(countingQty)
            const date = new Date().toISOString() // This is full ISO, backend might want date only? 
            // In list view we split('T')[0], so date-time is fine, or just date.
            // Let's send full ISO, assuming backend handles or casts.
            // Actually, for consistency with '2026-01-20', let's send YYYY-MM-DD?
            // Postgres 'date' type? Check schema?
            // Safest is ISO string, supabase usually handles it.

            const line = session.lines.find(l => l.material_id === selectedMaterialForCount.id)
            if (!line) return

            // 1. API Update (if real session)
            if (session.id !== 'new' && !session.id.toString().startsWith('C20')) {
                await cycleCountService.updateLine(line.id, {
                    qty_physical: qty,
                    count_date: date,
                    counted_by: userProfile?.id || userProfile?.email
                })
            }

            // 2. Update Local State (Immediate UI feedback)
            const updatedLines = session.lines.map(l =>
                l.material_id === selectedMaterialForCount.id
                    ? { ...l, qty_physical: qty, count_date: date, counted_by: userProfile?.id }
                    : l
            )
            setSession(prev => ({ ...prev, lines: updatedLines }))

            // 3. Update Simulation Storage (Legacy/Offline support)
            // REMOVED: Simulation storage logic.

            toast.success(`Count saved for ${selectedMaterialForCount.part_number}`)
            handleCloseCountPanel()

        } catch (error) {
            console.error("Failed to save count:", error)
            toast.error("Failed to save count")
        }
    }

    // Helper to clear form state
    const resetForm = () => {
        setSession(null)
        setTicketItems({})
        setIsSelectionEnabled(false)
        setAssignedUser('')
        setPlannedDate('')
        // Also clear filters to ensure clean slate
        setFilters({
            part_number: '',
            description: '',
            factory: '',
            location: '',
            process: '',
            area: '',
            machine: '',
            user: '',
            adjustment: 'all' // 'all', 'zero', 'positive', 'negative'
        })
    }

    const handleSaveTicket = async () => {
        const items = Object.values(ticketItems)
        if (items.length === 0) {
            toast.error("No items selected")
            return
        }

        // [New Validation] Ensure User and Date are selected before Saving
        if (!assignedUser || !plannedDate) {
            toast.error("Please select a User and Planned Date before accepting the ticket.")
            return
        }

        // Validate Date Future
        const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]
        if (plannedDate < minDate) {
            toast.error("Invalid date. Only future dates (tomorrow onwards) are allowed.")
            return
        }

        // [MODIFIED] Filter: Only process items that are NOT already active/done
        // We silently ignore items that are already in the session (linesMap)
        // This replaces the previous "Block all if any invalid" logic.
        const itemsToSave = items.filter(m => !linesMap[m.id])

        if (itemsToSave.length === 0) {
            toast.error("No valid items to add. All selected items are already active or done.")
            return
        }

        if (items.length > itemsToSave.length) {
            // Optional: Warn user that some items were skipped?
            // "Added X items. Y items were skipped as they are already active."
            toast.info(`Adding ${itemsToSave.length} items. Skipped ${items.length - itemsToSave.length} active items.`)
        }

        setSaving(true)
        try {
            let activeId = idRef.current

            // 1. Create Session if 'new'
            if (activeId === 'new') {
                const newSession = await cycleCountService.createSession({
                    assigned_to: assignedUser,
                    planned_date: plannedDate
                })
                if (newSession && newSession.id) {
                    activeId = newSession.id
                    // Update URL silently or via navigate replace
                    // We navigate AFTER success to avoid flash, but we need ID for lines
                    // We'll navigate at the end
                } else {
                    throw new Error("Failed to create session")
                }
            } else {
                // 1b. Update Existing Session
                await cycleCountService.updateSession(activeId, {
                    assigned_to: assignedUser,
                    planned_date: plannedDate
                })
            }

            // 2. Add Lines
            // itemsToSave is already filtered above
            // Use sequential loop to prevent backend socket saturation (WinError 10035)
            // The backend uses synchronous sockets in threads, and too many parallel requests causes it to crash.
            for (const item of itemsToSave) {
                try {
                    await cycleCountService.addLine(activeId, {
                        material_id: item.id,
                        qty_physical: null // Explicitly null for pending count
                    })
                } catch (err) {
                    console.error(`Failed to add line for material ${item.id}`, err)
                    // Continue adding others or break? 
                    // Better to continue and maybe show partial success, but for now just log.
                }
            }

            // DB SYNCHRONIZATION (Strict Source of Truth)
            // No optimistic updates. We fetch fresh data from the server.
            await fetchSession()

            toast.success(`Ticket saved! Assignment confirmed.`)



            // 3. Reset Form for Clean State (Next Entry)
            setTicketItems({})
            setIsSelectionEnabled(false)
            setAssignedUser('') // Clear User
            setPlannedDate('')  // Clear Date

            // 4. STAY on page ('new' mode). 
            // Do NOT update idRef to the new session ID. 
            // We want to remain in "Create Mode" so the next save creates a distinct session.
            // The table will show all active lines via getActiveLines() called by fetchSession().

            // If updating existing session, just refresh background data to be safe
            fetchSession().catch(err => console.warn("Background sync failed", err))

        } catch (error) {
            console.error("Save error:", error)
            toast.error("Failed to save ticket. Please check your connection.")
        } finally {
            setSaving(false)
        }
    }

    const handleResetStatus = async () => {
        const items = Object.values(ticketItems)
        if (items.length === 0) return

        // Strict Validation: ALL selected items must be 'VALIDATED' (DONE)
        // If even one item is not DONE, we block the action.
        const allDone = items.every(m => {
            const line = linesMap[m.id]
            return line && line.status === 'VALIDATED'
        })

        if (!allDone) {
            toast.error("Acción Inválida: Selección Mixta.", {
                description: "Solo se puede utilizar RE-COUNT cuando TODOS los items seleccionados tienen estatus 'DONE'. Por favor deselecciona los items pendientes o libres."
            })
            return
        }

        // Proceed if valid
        setConfirmResetModal({ isOpen: true, items: items }) // Pass original items since all are valid
    }

    const handleExecuteReset = async () => {
        const itemsToReset = confirmResetModal.items
        if (itemsToReset.length === 0) return

        setSaving(true)
        try {
            const materialIds = itemsToReset.map(m => m.id)
            await cycleCountService.archiveLines(materialIds)

            toast.success("Status reset successfully. Items can now be counted.")

            // Refresh catalog/active lines to update badges (remove DONE)
            // We need to re-fetch session if 'new' (active lines) or just reload catalog?
            // Actually fetchSession handles 'new' mode by fetching getActiveLines()
            await fetchSession()

            await fetchSession()

            // [MODIFIED] Keep selection active to allow immediate re-assignment
            // setTicketItems({}) <-- REMOVED

            toast.info("Items reset and ready for new assignment. Select User/Date and click ACCEPT.")

            setConfirmResetModal({ isOpen: false, items: [] })

        } catch (error) {
            console.error("Reset Error:", error)
            toast.error("Failed to reset item status")
        } finally {
            setSaving(false)
        }
    }

    // --- HISTORY SEARCH HANDLERS ---
    const handleHistoryClick = (item) => {
        // Clear existing timer
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current)

        setHistorySearchItem(item)

        // Set 5s Timer
        historyTimerRef.current = setTimeout(() => {
            setHistorySearchItem(null)
        }, 5000)
    }

    const handleExecuteHistorySearch = () => {
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
        setShowHistoryModal(true)
    }

    // --- ADJUSTMENT HANDLERS (Supervisor) ---
    const handleOpenAdjustment = (material) => {
        const line = linesMap[material.id]
        if (!line || line.qty_physical === null) {
            toast.error("User has not counted this item yet.")
            return
        }
        if (line.status === 'VALIDATED') {
            toast.info("This item is already validated.")
            return
        }

        setAdjustmentItem({ ...material, ...line }) // Merge material and line data
        setAdjustmentQty(line.qty_physical) // Default to user count
    }

    const handleCloseAdjustment = () => {
        setAdjustmentItem(null)
        setAdjustmentQty('')
        setShowConfirmModal(false)
    }

    const handleRequestConfirmation = () => {
        // Validation logic if needed (e.g. negative stock warning?)
        setShowConfirmModal(true)
    }

    const handleCommitAdjustment = async () => {
        if (!adjustmentItem) return

        setSaving(true)
        try {
            // 1. If Supervisor changed the qty, update the line first? 
            // Better to send the final qty to the commit endpoint or update line then commit.
            // Our commit_line endpoint takes the CURRENT line value.
            // So if supervisor changed it, we must update line first.

            if (parseInt(adjustmentQty) !== adjustmentItem.qty_physical) {
                await cycleCountService.updateLine(adjustmentItem.id, {
                    qty_physical: parseInt(adjustmentQty),
                    counted_by: userProfile?.id // Supervisor "takes over" the count? Or preserve original counter? 
                    // Let's preserve original counter but update value.
                })
            }

            // 2. Commit
            await cycleCountService.commitLine(adjustmentItem.id)

            toast.success(`Inventory updated for ${adjustmentItem.part_number}`)

            // 3. Update Local State (Visual Lock)
            setSession(prev => ({
                ...prev,
                lines: prev.lines.map(l => l.id === adjustmentItem.id ? { ...l, qty_physical: parseInt(adjustmentQty), status: 'VALIDATED' } : l)
            }))

            handleCloseAdjustment()

        } catch (error) {
            console.error("Adjustment Error:", error)
            toast.error("Failed to update inventory")
        } finally {
            setSaving(false)
        }
    }

    // Compute Lines Map for Table Lookup
    const linesMap = useMemo(() => {
        // Start with session lines (Strictly from DB now)
        const sessionLines = session?.lines || []

        return sessionLines.reduce((acc, line) => {
            // line.material_id might be int or string, ensure match
            const matId = line.material_id || line.material?.id
            if (matId) acc[matId] = line
            return acc
        }, {})
    }, [session])

    // Computed / Filtered Materials
    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            // VIEW MODE STRICT FILTER: 
            // If we are viewing a specific session (not 'new'), ONLY show materials that are part of the session
            // Unless the user explicitly cleared filters to search for new items (which we can assume View Mode = Read Only for now)
            if (id !== 'new') {
                if (!linesMap[m.id]) return false;
            }

            const matchPart = (m.part_number || '').toLowerCase().includes(filters.part_number.toLowerCase())
            const matchDesc = (m.name || '').toLowerCase().includes(filters.description.toLowerCase())
            const matchFactory = (m.plant || '').toLowerCase().includes(filters.factory.toLowerCase())
            const matchLoc = (m.location || '').toLowerCase().includes(filters.location.toLowerCase())
            const matchProcess = (m.process || '').toLowerCase().includes(filters.process.toLowerCase())
            const matchArea = (m.area || '').toLowerCase().includes(filters.area.toLowerCase())
            const matchMachine = (m.machine || '').toLowerCase().includes(filters.machine.toLowerCase())

            // User Filter logic
            let matchUser = true
            if (filters.user) {
                const line = linesMap[m.id]
                let userName = ''
                if (line?.counted_by) {
                    const u = users.find(u => u.id === line.counted_by)
                    userName = u?.full_name || u?.email || ''
                } else if (line?.session?.assigned_to) {
                    const u = users.find(u => u.id == line.session.assigned_to)
                    userName = u?.full_name || u?.email || ''
                } else if (session?.assigned_to) {
                    const u = users.find(u => u.id == session.assigned_to)
                    userName = u?.full_name || u?.email || ''
                }
                matchUser = userName.toLowerCase().includes(filters.user.toLowerCase())
            }



            // Critical Stock Filter (<= 2 units)
            if (showCriticalStock && (m.current_stock > 2)) return false

            // Adjustment Filter
            if (filters.adjustment && filters.adjustment !== 'all') {
                const line = linesMap[m.id]
                // Only items with a count can be filtered by adjustment (others are implicitly pending/unknown)
                if (!line || line.qty_physical === undefined || line.qty_physical === null) return false

                const diff = line.qty_physical - (line.qty_system ?? m.current_stock ?? 0)
                if (filters.adjustment === 'zero' && diff !== 0) return false
                if (filters.adjustment === 'positive' && diff <= 0) return false
                if (filters.adjustment === 'negative' && diff >= 0) return false
            }

            // Action Filter
            if (filters.action && filters.action !== 'all') {
                const line = linesMap[m.id]
                if (filters.action === 'validated' && (!line || line.status !== 'VALIDATED')) return false
                if (filters.action === 'closed' && (!line || line.qty_physical === undefined || line.qty_physical === null || line.status === 'VALIDATED')) return false
                if (filters.action === 'pending' && (!line || (line.qty_physical !== undefined && line.qty_physical !== null))) return false
                if (filters.action === 'unassigned' && line) return false // If line exists, it's assigned
            }

            // Planned Date Filter
            let matchPlannedDate = true
            if (filters.planned_date) {
                const line = linesMap[m.id]
                const dateStr = line?.planned_date || line?.session?.planned_date || session?.planned_date || (id === 'new' && ticketItems[m.id] ? plannedDate : null)
                // Convert to display format for filtering
                const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : ''
                matchPlannedDate = displayDate.includes(filters.planned_date)
            }

            // Real Date Filter
            let matchRealDate = true
            if (filters.real_date) {
                const line = linesMap[m.id]
                const dateStr = line?.count_date
                const displayDate = dateStr && !isNaN(new Date(dateStr).getTime())
                    ? new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : ''
                matchRealDate = displayDate.includes(filters.real_date)
            }

            return matchPart && matchDesc && matchFactory && matchLoc && matchProcess && matchArea && matchMachine && matchUser && matchPlannedDate && matchRealDate
        })
    }, [materials, filters, id, linesMap, showCriticalStock])

    // Detect if any filters are active
    const hasActiveFilters = useMemo(() => {
        return filters.part_number || filters.description || filters.factory || filters.location || filters.process || filters.area || filters.machine || filters.user || showCriticalStock || (filters.adjustment && filters.adjustment !== 'all') || (filters.action && filters.action !== 'all')
    }, [filters, showCriticalStock])

    // Detect if user is in counting mode (viewing existing session)
    const isCountingMode = useMemo(() => {
        // Counting mode when viewing an existing session (not creating new)
        // This applies to ALL users regardless of role
        // We check ONLY the id, not session, to avoid flash during load
        return id !== 'new'
    }, [id])



    // Calculate Stats
    const itemsCount = useMemo(() => {
        if (id === 'new') return Object.keys(ticketItems).length
        return session?.lines?.length || 0
    }, [id, ticketItems, session])

    const unitsCount = useMemo(() => {
        if (id === 'new') return Object.values(ticketItems).reduce((sum, m) => sum + (m.current_stock || 0), 0)
        // For existing session: Sum of counted physical quantities
        return session?.lines?.reduce((sum, l) => sum + (l.qty_physical || 0), 0) || 0
    }, [id, ticketItems, session])



    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">

            {/* 1. TOP HEADER (Brand + User) */}
            <div className="bg-primary-900 text-white px-6 py-2 grid grid-cols-3 items-center shrink-0 shadow-md z-20 relative overflow-hidden">

                {/* HISTORY SEARCH OVERLAY (Visible when item selected) */}
                {historySearchItem && (
                    <div className="absolute inset-0 bg-slate-900 z-50 flex items-center justify-between px-8 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-pulse">
                                <Clock size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-blue-300 uppercase font-bold tracking-widest">SEARCH HISTORY FOR</span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-xl font-bold text-white">{historySearchItem.part_number}</span>
                                    <span className="text-sm text-slate-400 truncate max-w-[300px]">{historySearchItem.name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-[9px] text-slate-500 font-mono">Auto-clear in 5s</span>
                            <button
                                onClick={handleExecuteHistorySearch}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-sm tracking-wide shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                <Search size={16} />
                                VIEW HISTORY
                            </button>
                            <button
                                onClick={() => setHistorySearchItem(null)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Timer Progress Bar (Visual Flair) */}
                        <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500 animate-[width_5s_linear_forwards] w-full" key={historySearchItem.id} />
                    </div>
                )}

                <div className="flex items-center gap-8 justify-start">
                    <div className="flex flex-col w-48">
                        <img src="/wasion_logo_large.png" alt="Wasion" className="h-8 object-contain object-left invert brightness-0" />
                        <div className="text-[10px] uppercase tracking-[0.4em] font-bold text-center leading-none mt-1 opacity-80">Made in Mexico</div>
                    </div>

                    {/* Session ID - Moved to Left Group */}
                    <div className="flex flex-col items-center -space-y-0.5">
                        <span className="text-[8px] text-primary-300 uppercase font-bold tracking-widest opacity-60">SESSION ID</span>
                        <span className="text-base font-bold tracking-wider text-white border-b border-primary-700/50 pb-0.5">{session?.ticket_id || id}</span>
                    </div>
                </div>

                {/* User Badge - CENTERED */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-3 bg-primary-800/50 rounded-full pr-4 pl-1 py-1 border border-primary-700/50">
                        <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center border border-white/20 overflow-hidden relative">
                            {userProfile?.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="User" className="h-full w-full object-cover" />
                            ) : (
                                <User size={18} />
                            )}
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs font-bold">{userProfile?.full_name || userProfile?.email || 'Admin'}</span>
                            <span className="text-[9px] text-primary-200 uppercase tracking-wider">{userProfile?.role || 'ADMIN'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center">
                    {/* SUPERVISOR TOOLS: History Mode Switch */}
                    {/* SUPERVISOR TOOLS: Item Detail Mode Active implicitly */}

                    <h1 className="text-xl font-bold tracking-wider">CYCLE COUNT</h1>
                    <div className="text-xs text-primary-300 uppercase tracking-widest">MATERIAL CATALOG</div>
                </div>
            </div>

            {/* 2. COMMAND BAR */}
            {/* Counting Mode: Show only HIDE CATALOG */}
            {isCountingMode ? (
                <div className="bg-primary-800 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10 gap-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleHideCatalog}
                            className="bg-white text-primary-900 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors shadow-sm"
                        >
                            HIDE CATALOG
                        </button>

                        {/* SUPERVISOR TOOLS: History Mode Switch */}
                        {/* History Mode Toggle Removed */}
                    </div>

                    {/* GENERAL COUNTERS (Realized / Missing) */}
                    <div className="flex items-center gap-6 px-6 py-1 bg-primary-900/40 rounded border border-primary-700/30">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold">REALIZED</span>
                            <span className="text-xl font-bold leading-none text-green-400">
                                {session?.lines?.filter(l => l.qty_physical !== null && l.qty_physical !== undefined).length || 0}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-primary-700/50"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold">MISSING</span>
                            <span className="text-xl font-bold leading-none text-amber-400">
                                {(session?.lines?.length || 0) - (session?.lines?.filter(l => l.qty_physical !== null && l.qty_physical !== undefined).length || 0)}
                            </span>
                        </div>
                    </div>



                    {/* NEW ADJUSTMENT COUNTERS (Grouped Items | Units) - SEPARATED BLOCKS */}

                    {/* 1. NEGATIVE GROUP (Red) */}
                    <div className="flex items-center gap-6 px-6 py-1 bg-primary-900/40 rounded border border-primary-700/30">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold text-red-400">NEG ITEMS</span>
                            <span className="text-lg font-bold leading-none text-red-400">
                                {session?.lines?.filter(l => l.qty_physical !== null && (l.qty_physical - (l.qty_system || 0) < 0)).length || 0}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-red-400/30"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold text-red-400">NEG UNITS</span>
                            <span className="text-lg font-bold leading-none text-red-400">
                                {session?.lines?.reduce((sum, l) => {
                                    if (l.qty_physical !== null && (l.qty_physical - (l.qty_system || 0) < 0)) {
                                        return sum + (l.qty_physical - (l.qty_system || 0));
                                    }
                                    return sum;
                                }, 0) || 0}
                            </span>
                        </div>
                    </div>

                    {/* 2. POSITIVE GROUP (Green) */}
                    <div className="flex items-center gap-6 px-6 py-1 bg-primary-900/40 rounded border border-primary-700/30">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold text-green-400">POS ITEMS</span>
                            <span className="text-lg font-bold leading-none text-green-400">
                                {session?.lines?.filter(l => l.qty_physical !== null && (l.qty_physical - (l.qty_system || 0) > 0)).length || 0}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-green-400/30"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold text-green-400">POS UNITS</span>
                            <span className="text-lg font-bold leading-none text-green-400">
                                +{session?.lines?.reduce((sum, l) => {
                                    if (l.qty_physical !== null && (l.qty_physical - (l.qty_system || 0) > 0)) {
                                        return sum + (l.qty_physical - (l.qty_system || 0));
                                    }
                                    return sum;
                                }, 0) || 0}
                            </span>
                        </div>
                    </div>

                    {/* 3. ZERO GROUP (Blue) */}
                    <div className="flex items-center gap-6 px-6 py-1 bg-primary-900/40 rounded border border-primary-700/30">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-primary-300 uppercase font-bold text-blue-400">ZERO ITEMS</span>
                            <span className="text-lg font-bold leading-none text-blue-400">
                                {session?.lines?.filter(l => l.qty_physical !== null && (l.qty_physical - (l.qty_system || 0) === 0)).length || 0}
                            </span>
                        </div>
                    </div>

                    {/* TIME STATUS */}
                    {session?.planned_date && (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded border border-primary-700/30 bg-primary-900/40">
                            <Clock size={16} className={new Date(session.planned_date) < new Date(new Date().toISOString().split('T')[0]) ? "text-red-400" : "text-green-400"} />
                            <div className="flex flex-col leading-none">
                                <span className="text-[9px] text-primary-300 uppercase font-bold">DEADLINE</span>
                                <span className={`text-xs font-bold ${new Date(session.planned_date) < new Date(new Date().toISOString().split('T')[0]) ? "text-red-400" : "text-green-400"}`}>
                                    {new Date(session.planned_date) < new Date(new Date().toISOString().split('T')[0]) ? "OVERDUE" : "ON TIME"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* FILTER STATUS & CLEAR */}
                    <div className="flex items-center gap-3 pl-4 border-l border-primary-700/50">

                        {/* FINISH SESSION BUTTON REMOVED - Workflow Changed to Item-Level Commit */}

                        <div className="flex items-center gap-3">
                            {/* Clear Filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors shadow-sm"
                                    title="Clear all filters"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <div className="flex flex-col items-end leading-none">
                                <span className="text-[9px] text-primary-300 uppercase font-bold">SHOWING</span>
                                <span className="text-xs font-bold text-white">
                                    {filteredMaterials.length} <span className="text-primary-400">/</span> {id === 'new' ? materials.length : (session?.lines?.length || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Supervisor Mode: Show full assignment controls */
                (() => {
                    // Resolve Effective Role for View
                    let role = userProfile?.role?.trim().toLowerCase()
                    // If context has adminViewMode (passed from Layout), use it to simulate role
                    const { adminViewMode } = (useOutletContext() || {})
                    if (role === 'admin' && adminViewMode) {
                        if (adminViewMode === 'toolroom') role = 'toolroom_staff'
                        if (adminViewMode === 'user') role = 'user'
                    }

                    const allowedRoles = ['admin', 'administrator', 'supervisor', 'supervisor_tool']
                    return allowedRoles.includes(role)
                })() && (
                    <div className="bg-primary-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm z-10">

                        {/* Left: Hide Catalog Button */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={handleHideCatalog}
                                className="bg-white text-primary-900 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                HIDE CATALOG
                            </button>
                        </div>

                        {/* Center: Assignment Controls */}
                        <div className="flex items-center gap-6 bg-primary-900/50 px-6 py-2 rounded-lg border border-primary-700/50">

                            {/* Assign To */}
                            <div className="flex flex-col">
                                <label className="text-[9px] text-primary-300 uppercase font-bold mb-0.5">ASSIGN TO</label>
                                <select
                                    disabled={isSelectionEnabled}
                                    className="bg-primary-800/80 border-none text-white text-xs rounded py-1 pl-2 pr-8 focus:ring-1 focus:ring-primary-400 w-48 cursor-pointer outline-none appearance-none disabled:opacity-50"
                                    value={assignedUser}
                                    onChange={(e) => setAssignedUser(e.target.value)}
                                >
                                    <option value="" className="text-gray-500" hidden>Select User...</option>
                                    {users
                                        .filter(u => ['toolroom_staff'].includes(u.role?.trim().toLowerCase()))
                                        .map(u => (
                                            <option key={u.id} value={u.id} className="text-black">{u.full_name || u.email}</option>
                                        ))}
                                </select>
                            </div>



                            {/* Planned Date */}
                            <div className="flex flex-col">
                                <label className="text-[9px] text-primary-300 uppercase font-bold mb-0.5">PLANNED DATE</label>
                                <div className="flex items-center bg-primary-800/80 rounded">
                                    <input
                                        type={plannedDate ? 'date' : 'text'}
                                        disabled={isSelectionEnabled}
                                        value={plannedDate}
                                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Restringir selección a futuro
                                        placeholder="dd/mm/yyyy"
                                        onFocus={(e) => e.target.type = 'date'}
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                                        onChange={(e) => setPlannedDate(e.target.value)}
                                        className="bg-transparent border-none text-white text-xs py-1 px-2 outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert cursor-pointer disabled:opacity-50 w-full"
                                    />
                                </div>
                            </div>

                            {/* Enable Selection Button (Moved here) */}
                            <div
                                onClick={handleEnableSelection}
                                className={clsx(
                                    "rounded p-1 shadow-sm cursor-pointer transition-colors mt-3", // Added margin-top to align visually with inputs if needed, or self-end? Flex items center handles vertical.
                                    isSelectionEnabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                                )}
                            >
                                <Check size={20} className="text-white" />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 px-4 border-l border-primary-700/50">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] text-primary-300 uppercase font-bold">ITEMS</span>
                                    <span className="text-lg font-bold leading-none">{itemsCount}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] text-primary-300 uppercase font-bold text-yellow-500">UNITS</span>
                                    <span className="text-lg font-bold leading-none text-yellow-500">{unitsCount}</span>
                                </div>
                            </div>



                            {/* Confirm/Cancel Actions Group 2 (Right side of bar in image) */}
                            <div className="flex gap-2 ml-2">
                                {/* RESET STATUS BUTTON (New) */}
                                {/* RESET STATUS BUTTON (New) */}
                                {(() => {
                                    // Strict Logic for UI Disable:
                                    // 1. Must have items selected.
                                    // 2. ALL selected items must be 'VALIDATED' (DONE).
                                    const items = Object.values(ticketItems)
                                    const allDone = items.length > 0 && items.every(m => {
                                        const line = linesMap[m.id]
                                        return line && line.status === 'VALIDATED'
                                    })

                                    return (
                                        <button
                                            onClick={handleResetStatus}
                                            // Enable strictly only if ALL selected are DONE
                                            disabled={!allDone || saving}
                                            className={clsx(
                                                "px-3 py-1.5 rounded shadow-sm transition-colors text-xs font-bold flex items-center gap-1",
                                                (!allDone || saving)
                                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70" // Visually disabled style
                                                    : "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" // Active style
                                            )}
                                            title={allDone ? "Reset status of selected items" : "Select only DONE items to enable"}
                                        >
                                            <RotateCcw size={14} />
                                            RE-COUNT
                                        </button>
                                    )
                                })()}

                                <button
                                    onClick={handleSaveTicket}
                                    // ENABLED if items selected. Validation inside handler.
                                    disabled={itemsCount === 0 || saving}
                                    className="bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded shadow-sm transition-colors text-xs font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'SAVING...' : 'ACCEPT'}
                                </button>
                                <button
                                    onClick={handleCancelTicket}
                                    // Cancel clears selection, so enable if items exist OR config locked
                                    disabled={(itemsCount === 0 && !isSelectionEnabled) || saving}
                                    className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded shadow-sm transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    CANCEL
                                </button>
                            </div>

                        </div>

                        {/* Right: Pagination Info */}
                        <div className="flex items-center gap-4 text-xs text-primary-200 font-medium">
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-200 p-1 rounded-full transition-colors"
                                    title="Clear all filters"
                                >
                                    <X size={14} />
                                </button>

                            )}

                            <span>Showing {filteredMaterials.length} of {id === 'new' ? materials.length : (session?.lines?.length || 0)}</span>
                        </div>
                    </div>
                )
            )}

            {/* 3. TABLE AREA */}
            <div className="flex-1 overflow-auto bg-white relative">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        {/* Header Row */}
                        <tr>
                            {/* [NEW] ID='new' (Creation Mode): Checkbox Column Header */}
                            {id === 'new' && (
                                <th className="p-2 border-b border-gray-100 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mx-auto block"
                                        checked={filteredMaterials.length > 0 && filteredMaterials.every(m => ticketItems[m.id])}
                                        onChange={handleSelectAll}
                                        title="Select All Visible"
                                    />
                                </th>
                            )}
                            <th className="p-2 border-b border-gray-100 w-32">PART #</th>
                            <th className="p-2 border-b border-gray-100 min-w-[200px]">DESCRIPTION</th>
                            <th className="p-2 border-b border-gray-100 text-center">FACTORY</th>
                            <th className="p-2 border-b border-gray-100 text-center">LOCATION</th>
                            <th className="p-2 border-b border-gray-100 text-center">PROCESS</th>
                            <th className="p-2 border-b border-gray-100 text-center">AREA</th>
                            <th className="p-2 border-b border-gray-100 text-center">MACHINE</th>
                            <th className="p-2 border-b border-gray-100 text-center w-24 bg-blue-50/50 text-blue-700">REAL QTY</th>
                            <th className="p-2 border-b border-gray-100 text-center w-24">ADJUSTMENT</th>
                            <th className="p-2 border-b border-gray-100 text-center w-20 text-gray-400">PREV STOCK</th>
                            <th className="p-2 border-b border-gray-100 text-center w-20">CURRENT STOCK</th>
                            <th className="p-2 border-b border-gray-100 text-center w-28 text-gray-300">PLANNED Date..</th>
                            <th className="p-2 border-b border-gray-100 text-center w-28 text-gray-300">REAL DATE</th>
                            <th className="p-2 border-b border-gray-100 text-center w-24 text-gray-300">USER</th>
                            <th className="p-2 border-b border-gray-100 text-center w-28">ACTION</th>
                        </tr>
                        <tr className="bg-white">
                            {/* Checkbox Filter Spacer */}
                            {id === 'new' && <th className="p-1 border-b border-gray-100"></th>}

                            <th className="p-1 border-b border-gray-100">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.part_number}
                                    onChange={(e) => setFilters({ ...filters, part_number: e.target.value })}
                                />
                            </th>

                            <th className="p-1 border-b border-gray-100">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.description}
                                    onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.factory || ''}
                                    onChange={(e) => setFilters({ ...filters, factory: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.location}
                                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.process}
                                    onChange={(e) => setFilters({ ...filters, process: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.area}
                                    onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.machine}
                                    onChange={(e) => setFilters({ ...filters, machine: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100"></th>

                            <th className="p-1 border-b border-gray-100 text-center w-24">
                                <div className="flex items-center justify-center gap-1">
                                    <button
                                        onClick={() => setFilters({ ...filters, adjustment: filters.adjustment === 'positive' ? 'all' : 'positive' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.adjustment === 'positive'
                                                ? "bg-blue-600 border-blue-700 text-white"
                                                : "bg-blue-50 border-blue-200 text-blue-500 hover:bg-blue-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Positive Adjustments"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => setFilters({ ...filters, adjustment: filters.adjustment === 'negative' ? 'all' : 'negative' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.adjustment === 'negative'
                                                ? "bg-red-500 border-red-600 text-white"
                                                : "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Negative Adjustments"
                                    >
                                        <Minus size={12} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => setFilters({ ...filters, adjustment: filters.adjustment === 'zero' ? 'all' : 'zero' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.adjustment === 'zero'
                                                ? "bg-green-500 border-green-600 text-white"
                                                : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Exact Matches"
                                    >
                                        <Check size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </th>
                            {/* Prev Stock Filter Spacer */}
                            <th className="p-1 border-b border-gray-100"></th>

                            {/* Current Stock Filter (Critical) */}
                            <th className="p-1 border-b border-gray-100 text-center">
                                <button
                                    onClick={() => setShowCriticalStock(!showCriticalStock)}
                                    className={clsx(
                                        "p-1.5 rounded transition-all shadow-sm border w-full",
                                        showCriticalStock
                                            ? "bg-red-500 border-red-600 text-white"
                                            : "bg-red-50 border-red-100 text-red-400 hover:border-red-300 hover:bg-red-100"
                                    )}
                                >
                                    <AlertTriangle size={14} strokeWidth={2.5} className="mx-auto" />
                                </button>
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.planned_date}
                                    onChange={(e) => setFilters({ ...filters, planned_date: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.real_date}
                                    onChange={(e) => setFilters({ ...filters, real_date: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 px-2">
                                <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 font-normal text-center focus:ring-1 focus:ring-primary-300 outline-none"
                                    placeholder="Filter..."
                                    value={filters.user}
                                    onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                                />
                            </th>
                            <th className="p-1 border-b border-gray-100 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <button
                                        onClick={() => setFilters({ ...filters, action: filters.action === 'validated' ? 'all' : 'validated' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.action === 'validated'
                                                ? "bg-green-500 border-green-600 text-white"
                                                : "bg-green-50 border-green-200 text-green-500 hover:bg-green-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Done (Validated) Items"
                                    >
                                        <CheckCircle size={12} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => setFilters({ ...filters, action: filters.action === 'closed' ? 'all' : 'closed' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.action === 'closed'
                                                ? "bg-gray-600 border-gray-700 text-white"
                                                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Closed (Counted) Items"
                                    >
                                        <Lock size={12} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => setFilters({ ...filters, action: filters.action === 'pending' ? 'all' : 'pending' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.action === 'pending'
                                                ? "bg-orange-500 border-orange-600 text-white"
                                                : "bg-orange-50 border-orange-200 text-orange-500 hover:bg-orange-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Pending Items"
                                    >
                                        <Clock size={12} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => setFilters({ ...filters, action: filters.action === 'unassigned' ? 'all' : 'unassigned' })}
                                        className={clsx(
                                            "w-6 h-6 flex items-center justify-center rounded transition-all shadow-sm border",
                                            filters.action === 'unassigned'
                                                ? "bg-blue-500 border-blue-600 text-white"
                                                : "bg-blue-50 border-blue-200 text-blue-500 hover:bg-blue-100 opacity-50 hover:opacity-100"
                                        )}
                                        title="Show Unassigned Items"
                                    >
                                        <Plus size={12} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                        {filteredMaterials.map((item, idx) => {
                            const isSelected = !!ticketItems[item.id]
                            const line = linesMap[item.id]

                            // Resolve User Name
                            let statusUser = '-'

                            // 1. [PRIORITY FIX] If we are in "New" mode creating a ticket, ALWAYS show the selection from dropdown if available for this new item
                            if (idRef.current === 'new' && ticketItems[item.id] && assignedUser) {
                                const u = users.find(user => user.id == assignedUser)
                                statusUser = u?.full_name || u?.email || 'Current Selection'
                            }
                            // 2. If line has explicit counted_by (Completed)
                            else if (line?.counted_by_profile) {
                                statusUser = line.counted_by_profile.full_name || line.counted_by_profile.email
                            }
                            else if (line?.counted_by) {
                                const u = users.find(user => user.id === line.counted_by)
                                statusUser = u?.full_name || u?.email || 'Unknown'
                            }
                            // 3. Check session assigned_to ID (Database)
                            else if (line?.session?.assigned_to_profile) {
                                statusUser = line.session.assigned_to_profile.full_name || line.session.assigned_to_profile.email
                            }
                            else if (line?.session?.assigned_to) {
                                const u = users.find(user => user.id == line.session.assigned_to)
                                statusUser = u?.full_name || u?.email || line?.session?.assignee?.full_name || 'Unknown'
                            }
                            // 4. Fallback to Parent Session Context
                            else if (session?.assigned_to_profile) {
                                statusUser = session.assigned_to_profile.full_name || session.assigned_to_profile.email
                            }
                            else if (session?.assigned_to) {
                                const u = users.find(user => user.id == session.assigned_to)
                                statusUser = u?.full_name || u?.email || 'Unknown'
                            }
                            // 5. Global Active Line Fallback
                            else if (linesMap[item.id]) {
                                statusUser = 'Pending (Assigned)'
                            }

                            // --- ALERTS LOGIC (Step 4) ---
                            // Check "Last Counted" warning
                            const lastCountedDate = item.last_counted_at ? new Date(item.last_counted_at) : null
                            let showLastCountedAlert = false
                            if (lastCountedDate) {
                                const daysSince = (new Date() - lastCountedDate) / (1000 * 60 * 60 * 24)
                                // Show warning if MORE than 25 days (approx 1 month cycle approaching limit)
                                // or if never counted (lastCountedDate is null usually handles by default rendering)
                                if (daysSince > 25) showLastCountedAlert = true
                            } else {
                                // Never counted? Maybe alert too? For now only cycle warning.
                                showLastCountedAlert = true
                            }
                            // Color code the alert: > 30 days RED, > 25 days ORANGE

                            // Visual Lock for Validated Items
                            const isValidated = line?.status === 'VALIDATED'

                            return (
                                <tr
                                    key={item.id}
                                    className={clsx(
                                        "transition-colors group odd:bg-white even:bg-slate-100",
                                        isSelected ? "bg-blue-100/50" : "hover:bg-blue-50/50",
                                        isCountingMode && "cursor-pointer hover:bg-primary-50",
                                        isValidated && "bg-green-50/50" // Light green tint for validated
                                    )}
                                    onClick={(e) => {
                                        // Ignore clicks on checkbox itself to prevent double toggle if logic overlaps
                                        if (e.target.type === 'checkbox') return

                                        // REMOVED: Global row click for Item Detail. Now specific to Part Number column.

                                        if (id === 'new') {
                                            // In creation mode, maybe we still want row click to toggle selection?
                                            // User asked to RESTRICT detail view. 
                                            // Let's keep row click for SELECTION toggle in 'new' mode if desired, or disable it.
                                            // For now, disabling detail popup on row click.
                                            return
                                        }

                                        if (isCountingMode) {
                                            // Role Detection (Existing Session Mode)
                                            const role = (userProfile?.role || '').trim().toLowerCase()
                                            const isSupervisor = ['admin', 'administrator', 'supervisor', 'supervisor_tool'].includes(role)

                                            if (isSupervisor) {
                                                handleOpenAdjustment(item)
                                            } else {
                                                handleOpenCountPanel(item)
                                            }
                                        }
                                    }}
                                >

                                    {/* [NEW] Checkbox Cell (Only in New Mode) */}
                                    {id === 'new' && (
                                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleItem(item)}
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                    )}

                                    {/* Part # */}
                                    {/* Part # */}
                                    <td
                                        className="p-2 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setItemDetail(item)
                                        }}
                                        title="View Material History & Details"
                                    >
                                        {item.part_number}
                                    </td>

                                    {/* Description */}
                                    <td className="p-2 truncate max-w-[200px]" title={item.name}>{item.name}</td>

                                    {/* Factory */}
                                    <td className="p-2 text-center text-gray-500">{item.plant || 'Planta 1'}</td>

                                    {/* Location */}
                                    <td className="p-2 text-center font-mono text-[10px] text-gray-600">{item.location || '-'}</td>

                                    {/* Process */}
                                    <td className="p-2 text-center text-[10px] uppercase">{item.process || 'N/A'}</td>

                                    {/* Area */}
                                    <td className="p-2 text-center text-[10px] uppercase">{item.area || ''}</td>

                                    {/* Machine */}
                                    <td className="p-2 text-center text-[10px] font-mono">{item.machine_asset || ''}</td>

                                    {/* Real Qty (Input/Display) */}
                                    <td className="p-1 text-center bg-blue-50/20">
                                        <span className="font-bold text-blue-900 block py-1">
                                            {line?.qty_physical !== undefined && line?.qty_physical !== null ? line.qty_physical : '-'}
                                        </span>
                                    </td>

                                    {/* Adjustment (Difference) */}
                                    <td className="p-2 text-center font-bold">
                                        {(() => {
                                            if (line?.qty_physical !== undefined && line?.qty_physical !== null) {
                                                const systemStock = line.qty_system ?? item.current_stock ?? 0
                                                const diff = line.qty_physical - systemStock
                                                if (diff === 0) return <span className="text-green-500">0</span>
                                                return <span className={diff > 0 ? "text-blue-600" : "text-red-500"}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </span>
                                            }
                                            return <span className="text-gray-300">-</span>
                                        })()}
                                    </td>

                                    {/* PREV STOCK (Snapshot) */}
                                    <td className="p-2 text-center text-gray-400 font-mono text-xs">
                                        {line?.qty_system ?? '-'}
                                    </td>

                                    {/* CURRENT STOCK (Live System) */}
                                    <td className="p-2 text-center bg-gray-50/50">
                                        {(() => {
                                            const currentStock = item.current_stock;
                                            const isLowStock = currentStock <= 2;
                                            return (
                                                <div className="flex items-center justify-center gap-2">
                                                    {isLowStock ? (
                                                        <div className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                            <AlertTriangle size={12} />
                                                            <span className="font-bold">{currentStock}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-gray-700">{currentStock}</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    <td className="p-2 text-center text-xs text-gray-600 font-medium">
                                        {(() => {
                                            // Priority: 1. Line specific date, 2. Line's session date, 3. Global Session date, 4. Local selection (New mode)
                                            const dateStr = line?.planned_date || line?.session?.planned_date || session?.planned_date || (isSelected && plannedDate ? plannedDate : null)
                                            return dateStr
                                                ? new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
                                                // Note: Planned Date usually comes as YYYY-MM-DD from backend (date type), so UTC avoids timezone shift. 
                                                : '-'
                                        })()}
                                    </td>

                                    <td className="p-2 text-center text-xs text-gray-700 font-medium relative">
                                        {line?.count_date ? (
                                            /* Handle potential bad formats by parsing timestamp securely */
                                            !isNaN(new Date(line.count_date).getTime())
                                                ? new Date(line.count_date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                : line.count_date // Fallback if parsing fails
                                        ) : '-'}
                                    </td>

                                    {/* User */}
                                    <td className="p-2 text-center text-xs text-gray-600 font-medium">
                                        {statusUser}
                                    </td>

                                    {/* Action Button */}
                                    <td className="p-1 text-center">
                                        {line ? (
                                            (line.qty_physical !== undefined && line.qty_physical !== null) ? (
                                                isValidated ? (
                                                    <div className="flex items-center justify-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">
                                                        <CheckCircle size={10} />
                                                        <span className="text-[9px] font-extrabold uppercase tracking-wider">DONE</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation() // Prevent row click
                                                            // Resolve role dynamically inside render to be safe or use variable from scope
                                                            const role = (userProfile?.role || '').trim().toLowerCase()
                                                            const isSupervisor = ['admin', 'administrator', 'supervisor', 'supervisor_tool'].includes(role)

                                                            if (isSupervisor) {
                                                                handleOpenAdjustment(item)
                                                            }
                                                        }}
                                                        className={clsx(
                                                            "text-xs font-extrabold px-2 py-0.5 rounded border transition-colors",
                                                            // Check role again for styling
                                                            ['admin', 'administrator', 'supervisor', 'supervisor_tool'].includes((userProfile?.role || '').trim().toLowerCase())
                                                                ? "bg-white border-blue-300 text-blue-600 hover:bg-blue-50 cursor-pointer shadow-sm hover:shadow-md"
                                                                : "bg-gray-100 border-gray-300 text-gray-700 cursor-default"
                                                        )}
                                                        title={['admin', 'administrator', 'supervisor', 'supervisor_tool'].includes((userProfile?.role || '').trim().toLowerCase()) ? "Click to Validate/Adjust" : "Pending Validation"}
                                                    >
                                                        CLOSED
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-orange-400 text-[10px] font-bold opacity-80 uppercase tracking-wider">PENDING</span>
                                            )
                                        ) : (
                                            <button
                                                onClick={() => handleToggleItem(item)}
                                                disabled={!isSelectionEnabled} // Only enable when user/date selected & checked
                                                className={clsx(
                                                    "rounded p-1 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                                                    isSelected
                                                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                                                        : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                                )}
                                            >
                                                {isSelected ? <Trash2 size={14} /> : <Plus size={14} />}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {filteredMaterials.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Filter size={40} className="text-gray-300 mb-4" />
                        <p className="text-gray-400">No materials found matching filters</p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmResetModal.isOpen}
                onClose={() => setConfirmResetModal({ isOpen: false, items: [] })}
                onConfirm={handleExecuteReset}
                title="Confirm Status Reset"
                message={(() => {
                    const totalSelected = Object.values(ticketItems).length
                    const resetting = confirmResetModal.items.length

                    if (resetting < totalSelected) {
                        return `Has seleccionado ${totalSelected} items, pero solo ${resetting} estan 'DONE'.\n\nSolo se reiniciaran los items 'DONE'. ¿Deseas continuar?`
                    }
                    return `Are you sure you want to reset the status for ${resetting} items? This will allow them to be counted again immediately.`
                })()}
                confirmText="Reset Status"
                type="warning"
                isLoading={saving}
            />

            {/* Counting Detail Panel */}
            {
                selectedMaterialForCount && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseCountPanel}>
                        <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-md" onClick={(e) => e.stopPropagation()}>

                            {/* Header + Date Status Combined */}
                            {(() => {
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)

                                // FIX: Parse date as LOCAL time to avoid UTC shift (e.g. 24th becoming 23rd in GMT-6)
                                const pDateStr = (session?.planned_date || '').split('T')[0] // Ensure YYYY-MM-DD
                                let plannedDate = new Date()
                                if (pDateStr && pDateStr.includes('-')) {
                                    const [py, pm, pd] = pDateStr.split('-').map(Number)
                                    plannedDate = new Date(py, pm - 1, pd)
                                }
                                plannedDate.setHours(0, 0, 0, 0)

                                const isOnTime = today <= plannedDate
                                const daysLate = Math.floor((today - plannedDate) / (1000 * 60 * 60 * 24))

                                return (
                                    <div className={clsx(
                                        "px-6 py-4 flex flex-col items-center justify-center border-b",
                                        isOnTime ? "bg-green-50" : "bg-orange-50"
                                    )}>
                                        <h2 className="text-xl font-bold text-primary-900">Material Count</h2>
                                        <div className={clsx(
                                            "text-sm font-bold mt-1 flex items-center gap-2",
                                            isOnTime ? "text-green-700" : "text-orange-700"
                                        )}>
                                            {isOnTime ? (
                                                <>
                                                    <CheckCircle size={16} />
                                                    <span>ON TIME ({new Date().toISOString().split('T')[0]})</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle size={16} />
                                                    <span>DELAYED ({daysLate} day{daysLate > 1 ? 's' : ''} late)</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Planned: {session?.planned_date}
                                        </div>
                                    </div>
                                )
                            })()}

                            <div className="p-8">
                                {/* Material Info - Grid Layout */}
                                <div className="mb-8">
                                    {/* Header Row: Part # & View Image */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Part Number</span>
                                            <span className="text-2xl font-bold text-primary-900 leading-none">{selectedMaterialForCount.part_number}</span>
                                        </div>

                                        {/* Image Button - Always visible if image exists, styled prominently */}
                                        {selectedMaterialForCount.image_url ? (
                                            <button
                                                onClick={() => {
                                                    let url = selectedMaterialForCount.image_url
                                                    if (url && !url.startsWith('http')) {
                                                        url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${url}`
                                                    }
                                                    setPreviewImage(url)
                                                }}
                                                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                                                title="View Image"
                                            >
                                                <ImageIcon size={18} />
                                                <span className="text-xs font-bold uppercase">View Photo</span>
                                            </button>
                                        ) : (
                                            <div className="text-gray-300 flex items-center gap-1 opacity-50 select-none">
                                                <ImageIcon size={18} />
                                                <span className="text-xs font-bold uppercase">No Photo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description Row */}
                                    <div className="mb-6">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 block">Description</span>
                                        <p className="text-gray-800 font-medium text-sm leading-relaxed border-l-4 border-primary-200 pl-3">
                                            {selectedMaterialForCount.name}
                                        </p>
                                    </div>

                                    {/* Details Box (Grey) - 3 Column Grid */}
                                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex flex-col items-center border-r border-gray-200 last:border-0 px-2">
                                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Plant</span>
                                            <span className="font-semibold text-gray-900 text-sm text-center">{selectedMaterialForCount.plant || '-'}</span>
                                        </div>
                                        <div className="flex flex-col items-center border-r border-gray-200 last:border-0 px-2">
                                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Location</span>
                                            <span className="font-semibold text-gray-900 text-sm text-center font-mono">{selectedMaterialForCount.location || '-'}</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">System Stock</span>
                                            <span className="font-bold text-blue-600 text-xl leading-none">{selectedMaterialForCount.current_stock}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Real Qty Input Section */}
                                <div className="mb-8 p-4 bg-primary-50/50 rounded-xl border border-primary-100">
                                    <label className="block text-xs font-bold text-primary-800 uppercase tracking-wide mb-3 text-center">Enter Physical Count</label>
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="number"
                                            value={countingQty}
                                            onChange={(e) => setCountingQty(e.target.value)}
                                            className="w-48 text-center bg-white border-2 border-primary-200 rounded-lg py-3 text-3xl font-bold text-primary-900 focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder-gray-300 shadow-sm"
                                            placeholder="0"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveCount()
                                                if (e.key === 'Escape') handleCloseCountPanel()
                                            }}
                                        />
                                    </div>

                                    {/* Difference Indicator */}
                                    {countingQty !== '' && (
                                        <div className="flex justify-center mt-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                            {(() => {
                                                const val = parseInt(countingQty) || 0
                                                const diff = val - selectedMaterialForCount.current_stock
                                                if (diff === 0) {
                                                    return <span className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 px-4 py-1.5 rounded-full border border-green-200">
                                                        <CheckCircle size={14} className="fill-green-700 text-green-100" />
                                                        Exact Match
                                                    </span>
                                                }
                                                return (
                                                    <span className={clsx(
                                                        "flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full border shadow-sm",
                                                        diff > 0
                                                            ? "text-blue-700 bg-blue-50 border-blue-200"
                                                            : "text-red-700 bg-red-50 border-red-200"
                                                    )}>
                                                        <AlertTriangle size={14} />
                                                        {diff > 0 ? `+${diff} Surplus` : `${diff} Missing`}
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveCount}
                                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-sm"
                                    >
                                        SAVE COUNT
                                    </button>
                                    <button
                                        onClick={handleCloseCountPanel}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh]">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                            >
                                <X size={32} />
                            </button>
                            <img
                                src={previewImage}
                                alt="Material Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-gray-700"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )
            }
            {/* 6. ADJUSTMENT MODAL (Supervisor) */}
            {
                adjustmentItem && !showConfirmModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-96 transform transition-all scale-100 p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Validate Count</h3>
                                    <p className="text-sm text-gray-500">{adjustmentItem.part_number}</p>
                                </div>
                                <button onClick={handleCloseAdjustment} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-200">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">System Stock</span>
                                        <span className="text-2xl font-bold text-gray-700">{adjustmentItem.current_stock || 0}</span>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                                        <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">User Count</span>
                                        <span className="text-2xl font-bold text-blue-600">{adjustmentItem.qty_physical}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Final Adjustment (Definitive)</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setAdjustmentQty(prev => Math.max(0, parseInt(prev || 0) - 1))}
                                            className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <input
                                            type="number"
                                            value={adjustmentQty}
                                            onChange={(e) => setAdjustmentQty(e.target.value)}
                                            className="flex-1 h-10 text-center font-bold text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            onClick={() => setAdjustmentQty(prev => parseInt(prev || 0) + 1)}
                                            className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-3">
                                    <button
                                        onClick={handleCloseAdjustment}
                                        className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={handleRequestConfirmation}
                                        className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/30"
                                    >
                                        ADJUST
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 7. DOUBLE CONFIRMATION MODAL */}
            {
                showConfirmModal && adjustmentItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-8 border-4 border-yellow-400/50 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <AlertTriangle size={40} className="text-yellow-600" />
                                </div>

                                <h2 className="text-3xl font-black text-gray-900 mb-2">ARE YOU SURE?</h2>
                                <p className="text-gray-500 mb-8 max-w-sm">
                                    System inventory will be updated. This action is definitive and will be recorded.
                                </p>

                                <div className="w-full bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8 flex items-center justify-around relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full transform -skew-x-12 translate-x-full animate-shimmer" />

                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">CURRENT STOCK</span>
                                        <span className="text-4xl font-black text-gray-400 strike-through decoration-red-500/50 decoration-4">{adjustmentItem.current_stock || 0}</span>
                                    </div>

                                    <ArrowLeft size={32} className="text-gray-300 transform rotate-180" />

                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">NEW STOCK</span>
                                        <span className="text-5xl font-black text-blue-600 drop-shadow-sm">{adjustmentQty}</span>
                                    </div>
                                </div>

                                {/* DIFFERENCE INDICATOR */}
                                <div className="flex justify-center mb-8 -mt-4">
                                    {(() => {
                                        const diff = parseInt(adjustmentQty) - (adjustmentItem.current_stock || 0);
                                        if (diff === 0) return null;
                                        const isPositive = diff > 0;
                                        return (
                                            <div className={clsx(
                                                "flex items-center gap-2 px-6 py-2 rounded-full font-black text-xl shadow-lg transform hover:scale-105 transition-transform",
                                                isPositive ? "bg-blue-100 text-blue-700 border-2 border-blue-200" : "bg-red-100 text-red-700 border-2 border-red-200"
                                            )}>
                                                {isPositive ? <Plus size={24} strokeWidth={3} /> : <Minus size={24} strokeWidth={3} />}
                                                <span>{Math.abs(diff)} UNITS</span>
                                            </div>
                                        )
                                    })()}
                                </div>

                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => setShowConfirmModal(false)}
                                        className="flex-1 py-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors uppercase tracking-wider text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCommitAdjustment}
                                        disabled={saving}
                                        className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-transform active:scale-95 shadow-xl shadow-blue-500/30 uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                                    >
                                        {saving ? 'Processing...' : (
                                            <>
                                                CONFIRM CHANGE
                                                <CheckCircle size={18} strokeWidth={3} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* 8. HISTORY MODAL */}
            {/* 8. HISTORY MODAL */}
            <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>}>
                {showHistoryModal && (historySearchItem || itemDetail) && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                        <div className="w-full max-w-6xl h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <CycleCountHistoryModal
                                materialId={historySearchItem?.id || itemDetail?.id}
                                materialName={historySearchItem?.name || itemDetail?.name}
                                onClose={() => {
                                    setShowHistoryModal(false)
                                    setHistorySearchItem(null)
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* 9. ITEM DETAIL POPUP (New) */}
                {itemDetail && !showHistoryModal && (
                    <CycleCountItemDetailModal
                        item={itemDetail}
                        onClose={() => setItemDetail(null)}
                        onViewHistory={(item) => {
                            // Fix Race Condition: Set search item state BEFORE closing detail / opening history
                            setHistorySearchItem(item)
                            setShowHistoryModal(true)
                        }}
                    />
                )}
            </Suspense>
        </div >
    )
}
