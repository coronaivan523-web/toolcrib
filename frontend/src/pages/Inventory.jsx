import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Package, AlertCircle, Loader2, UploadCloud, Box, ClipboardList, MapPin, User, Check, X, Tag, Minus, History, Info } from 'lucide-react'
import clsx from 'clsx'

export default function Inventory() {
    const [materials, setMaterials] = useState([])
    const [locations, setLocations] = useState([])
    const [profiles, setProfiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Deactivation Workflow State
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
    const [deactivateSearch, setDeactivateSearch] = useState('')
    const [selectedDeactivateItem, setSelectedDeactivateItem] = useState(null)
    const [deactivationReason, setDeactivationReason] = useState('')

    // Auth Fields for Deactivation
    const [authChinese, setAuthChinese] = useState('')
    const [authMexican, setAuthMexican] = useState('')
    const [authTechnical, setAuthTechnical] = useState('')

    // Archive View State
    const [isArchiveView, setIsArchiveView] = useState(false)

    // Detail & History View State
    const [selectedItemAction, setSelectedItemAction] = useState(null)
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [detailTab, setDetailTab] = useState('info') // 'info' | 'history'
    const [itemHistory, setItemHistory] = useState([])
    const [previewImage, setPreviewImage] = useState(null)

    // Filters
    const [filterStatus, setFilterStatus] = useState('all') // User wants to see all items by default
    const [filterType, setFilterType] = useState('all')
    const [filterABC, setFilterABC] = useState('all')
    const [filterOrigin, setFilterOrigin] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterProcess, setFilterProcess] = useState('all') // NEW
    const [filterArea, setFilterArea] = useState('all') // NEW - Missing previously
    const [filterRequestedBy, setFilterRequestedBy] = useState('') // NEW
    const [filterMachine, setFilterMachine] = useState('all') // NEW
    const [filterAction, setFilterAction] = useState('all') // NEW

    const [newMaterial, setNewMaterial] = useState({
        part_number: '',
        name: '',
        description: '',
        category: 'General',
        material_type: 'spare_part',
        abc_class: 'B',
        origin_country: 'MX',
        unit_of_measure: 'unit',
        min_stock: 5,
        max_stock: 100,
        current_stock: 0,
        location: '',
        process: '',
        Area: '',
        requested_by: '',
        requested_by_position: '',
        machine_asset: '',
        image_file: null,
        created_by: null, // Will be set in handleCreate
        action_type: 'Alta'
    })

    // Edit Limits State
    const [isEditLimitsOpen, setIsEditLimitsOpen] = useState(false)
    const [editLimitsForm, setEditLimitsForm] = useState({
        min_stock: 0,
        max_stock: 0,
        requested_by: ''
    })

    // Limit History State
    const [isLimitHistoryOpen, setIsLimitHistoryOpen] = useState(false)
    const [limitHistory, setLimitHistory] = useState([])

    const handleOpenLimitHistory = async () => {
        if (!selectedItemAction) return
        try {
            // 1. Fetch Events (No Join) to avoid Schema Cache issues
            const { data: events, error: eventsError } = await supabase
                .from('material_events')
                .select('*')
                .eq('material_id', selectedItemAction.id)
                .eq('event_type', 'LIMIT_UPDATE')
                .order('created_at', { ascending: false })

            if (eventsError) throw eventsError

            if (!events || events.length === 0) {
                setLimitHistory([])
                setDetailTab('limit_history')
                setIsDetailModalOpen(true)
                return
            }

            // 2. Extract User IDs
            const userIds = [...new Set(events.map(e => e.performed_by).filter(Boolean))]

            // 3. Fetch Profiles manually
            let profilesMap = {}
            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .in('id', userIds)

                if (!profilesError && profiles) {
                    profilesMap = profiles.reduce((acc, profile) => {
                        acc[profile.id] = profile
                        return acc
                    }, {})
                }
            }

            // 4. Merge Data
            const combinedHistory = events.map(event => ({
                ...event,
                profiles: profilesMap[event.performed_by] || { email: 'Unknown' } // Mimic the structure used in UI
            }))

            setLimitHistory(combinedHistory)
            // setIsLimitHistoryOpen(true) // Deprecated: Don't open separate modal
            setDetailTab('limit_history') // Switch to the new tab
            setIsDetailModalOpen(true)    // Open the main detail modal
        } catch (error) {
            console.error("Error fetching limit history:", error)
            alert(`Error fetching history: ${error.message}`)
        }
    }

    // RBAC: User Role State
    const [userRole, setUserRole] = useState(null)
    const [currentUser, setCurrentUser] = useState(null) // Added state for user object
    const [userProfile, setUserProfile] = useState(null) // NEW: State for full profile (name, avatar)

    const fetchUserRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setCurrentUser(user) // Save user to state
            if (user) {
                // Fetch role and profile details
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, full_name, avatar_url')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setUserRole(data.role)
                    setUserProfile(data) // Save full profile
                    console.log("Current User Role:", data.role)
                }
            }
        } catch (error) {
            console.error("Error fetching user role:", error)
        }
    }

    const handleOpenEditLimits = () => {
        if (selectedItemAction) {
            setEditLimitsForm({
                min_stock: '', // Start empty to force input
                max_stock: '', // Start empty to force input
                requested_by: '', // Start empty
                requested_by_position: '', // Start empty
                justification: '',
                chinese_auth: false,
                chinese_authorizer: '',
                evidence_file: null,
                modifier_name: '', // Start empty (was currentUser)
                modifier_position: '',
                modifier_area: ''
            })
            setIsEditLimitsOpen(true)
        }
    }

    const handleSaveLimits = async () => {
        try {
            // VALIDATION: Strict check for all mandatory fields
            // check for empty string explicitly to allow '0' as a valid value
            if (
                editLimitsForm.min_stock === '' || editLimitsForm.min_stock === null ||
                editLimitsForm.max_stock === '' || editLimitsForm.max_stock === null ||
                !editLimitsForm.requested_by?.trim() ||
                !editLimitsForm.requested_by_position?.trim() ||
                !editLimitsForm.justification?.trim() ||
                !editLimitsForm.modifier_name?.trim() ||
                !editLimitsForm.modifier_position?.trim() ||
                !editLimitsForm.modifier_area?.trim() ||
                !editLimitsForm.evidence_file // File is mandatory
            ) {
                alert("All fields are mandatory without exception. Please fill in all details and upload evidence.")
                return
            }

            if (editLimitsForm.chinese_auth && !editLimitsForm.chinese_authorizer?.trim()) {
                alert("Please provide the name of the Chinese Authorizer.")
                return
            }

            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            // 1. Prepare Update Payload
            let evidenceImageUrl = null

            const updates = {
                min_stock: parseInt(editLimitsForm.min_stock),
                max_stock: parseInt(editLimitsForm.max_stock),
                requested_by: editLimitsForm.requested_by,
                requested_by_position: editLimitsForm.requested_by_position, // Updates position
                action_type: 'Modification', // Update status to reflect change
                // status: 'modified', // REMOVED: User wants to keep original status
                created_at: new Date().toISOString(), // Overwriting creation date as requested
                registered_by: user.email // Registering the technician who modified it
            }

            // 2. Update Material
            const { error } = await supabase
                .from('materials')
                .update(updates)
                .eq('id', selectedItemAction.id)

            if (error) throw error

            // 3. Log History Event (Audit Trail)
            const changes = []
            if (updates.min_stock !== selectedItemAction.min_stock) changes.push(`Min: ${selectedItemAction.min_stock} -> ${updates.min_stock}`)
            if (updates.max_stock !== selectedItemAction.max_stock) changes.push(`Max: ${selectedItemAction.max_stock} -> ${updates.max_stock}`)
            if (updates.requested_by !== selectedItemAction.requested_by) changes.push(`Requestor: ${selectedItemAction.requested_by || 'None'} -> ${updates.requested_by}`)
            if (updates.requested_by_position !== selectedItemAction.requested_by_position) changes.push(`Position: ${selectedItemAction.requested_by_position || 'None'} -> ${updates.requested_by_position}`)

            // Always include Justification and include Chinese Authorizer in notes if present
            if (editLimitsForm.justification) changes.push(`Justification: ${editLimitsForm.justification}`)
            changes.push(`Chinese Auth: ${editLimitsForm.chinese_auth ? 'Yes' : 'No'}`)
            if (editLimitsForm.chinese_auth && editLimitsForm.chinese_authorizer) changes.push(`Auth By: ${editLimitsForm.chinese_authorizer}`)

            if (editLimitsForm.evidence_file) {
                const fileExt = editLimitsForm.evidence_file.name.split('.').pop()
                const fileName = `${selectedItemAction.id}_${Date.now()}.${fileExt}`
                const filePath = `${selectedItemAction.id}/${fileName}`

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('audit-evidence')
                    .upload(filePath, editLimitsForm.evidence_file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage.from('audit-evidence').getPublicUrl(filePath)
                evidenceImageUrl = publicUrl

                changes.push(`Evidence: [Image Link]`)
            }

            if (changes.length > 0) {
                await supabase.from('material_events').insert({
                    material_id: selectedItemAction.id,
                    event_type: 'LIMIT_UPDATE',
                    performed_by: user.id,
                    notes: changes.join(', '),
                    chinese_auth: editLimitsForm.chinese_auth,
                    chinese_authorizer: editLimitsForm.chinese_auth ? editLimitsForm.chinese_authorizer : null,
                    // action_type removed from here, moved to material updates
                    evidence_image_path: evidenceImageUrl,
                    modifier_name: editLimitsForm.modifier_name,
                    modifier_position: editLimitsForm.modifier_position,
                    modifier_area: editLimitsForm.modifier_area
                })
            }

            // 4. Refresh Data
            await fetchMaterials() // Reload list

            // Update local selected item
            setSelectedItemAction(prev => ({ ...prev, ...updates }))

            setIsEditLimitsOpen(false)
            // Optional: Show success toast
        } catch (error) {
            console.error("Error updating limits:", error)
            alert("Failed to update limits: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    // Logic for filteredMaterials
    const filteredMaterials = (materials || []).filter(m => {
        if (!m) return false;

        // Name / Part Number Filter (Safe)
        const name = m.name ? String(m.name).toLowerCase() : ''
        const partNo = m.part_number ? String(m.part_number).toLowerCase() : ''
        const search = searchTerm.toLowerCase()
        const matchesName = name.includes(search) || partNo.includes(search)

        // Requested By Filter (Safe)
        const requestedVars = m.requested_by ? String(m.requested_by).toLowerCase() : ''
        const reqFilter = filterRequestedBy.toLowerCase()
        const matchesRequested = filterRequestedBy === '' || requestedVars.includes(reqFilter)

        const matchesStatus = filterStatus === 'all' || m.status === filterStatus
        const matchesType = filterType === 'all' ||
            (filterType === 'spare_part' ? m.material_type !== 'consumable' : m.material_type === filterType)
        const matchesABC = filterABC === 'all' || m.abc_class === filterABC
        const matchesOrigin = filterOrigin === 'all' || m.origin_country === filterOrigin
        const matchesCategory = filterCategory === 'all' || m.category === filterCategory
        const matchesProcess = filterProcess === 'all' || m.process === filterProcess
        const matchesArea = filterArea === 'all' || m.Area === filterArea
        const matchesMachine = filterMachine === 'all' || m.machine_asset === filterMachine
        const matchesAction = filterAction === 'all' || m.action_type === filterAction

        return matchesName && matchesRequested && matchesStatus && matchesType && matchesABC && matchesOrigin && matchesCategory && matchesProcess && matchesArea && matchesMachine && matchesAction
    })

    useEffect(() => {
        fetchMaterials()
    }, [isArchiveView]) // Refetch when view changes

    useEffect(() => {
        fetchLocations()
        fetchProfiles()
        fetchUserRole()
    }, [])

    const fetchMaterials = async () => {
        try {
            setLoading(true)
            setError(null)

            const { data: { session }, error: authError } = await supabase.auth.getSession()
            if (authError) console.error('Auth error:', authError)

            const tableName = isArchiveView ? 'archived_materials' : 'materials'
            let query = supabase
                .from(tableName)
                .select('*')

            // Order by archived_at for archive view, created_at for active
            if (isArchiveView) {
                query = query.order('archived_at', { ascending: false })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            const { data, error } = await query

            if (error) throw error

            // OPTIMIZATION: Use Public URLs directly to avoid N+1 requests
            const materialsWithUrls = data.map(m => {
                if (m.image_url && !m.image_url.startsWith('http')) {
                    return {
                        ...m,
                        signed_image_url: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/material-images/${m.image_url}`
                    }
                }
                return { ...m, signed_image_url: m.image_url }
            })

            setMaterials(materialsWithUrls)
        } catch (error) {
            console.error('Error fetching materials:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchHistory = async (id) => {
        try {
            // Basic events from material_events
            const { data, error } = await supabase
                .from('material_events')
                .select(`
                   *,
                   performed_by_user:performed_by(email)
               `)
                .eq('material_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItemHistory(data || []);
        } catch (err) {
            console.error("Error fetching history:", err)
        }
    }

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('id, code, description')
                .order('code')

            if (error) throw error
            setLocations(data)
        } catch (error) {
            console.error('Error fetching locations:', error)
        }
    }

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')

            if (error) {
                console.warn('Error fetching profiles (might not exist yet):', error)
                return
            }
            setProfiles(data || [])
        } catch (error) {
            console.error('Error fetching profiles:', error)
        }
    }

    // Row Click Logic
    const handleRowClick = (item) => {
        setSelectedItemAction(item);
        setIsActionMenuOpen(true);
    }

    const handleOpenHistory = () => {
        if (selectedItemAction) {
            fetchHistory(selectedItemAction.id);
            setDetailTab('history');
            setIsActionMenuOpen(false);
            setIsDetailModalOpen(true);
        }
    }

    const handleOpenDetails = () => {
        if (selectedItemAction) {
            setDetailTab('info');
            setIsActionMenuOpen(false);
            setIsDetailModalOpen(true);
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            const { data: { user } } = await supabase.auth.getUser()

            let uploadedImagePath = null

            if (newMaterial.image_file) {
                setUploading(true)
                const file = newMaterial.image_file
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError, data } = await supabase.storage
                    .from('material-images')
                    .upload(filePath, file)

                if (uploadError) throw uploadError
                uploadedImagePath = data.path
                setUploading(false)
            }

            const materialToCreate = {
                part_number: newMaterial.part_number,
                name: newMaterial.name,
                description: newMaterial.description,
                category: newMaterial.category,
                material_type: newMaterial.material_type,
                abc_class: newMaterial.abc_class,
                origin_country: newMaterial.origin_country,
                unit_of_measure: newMaterial.unit_of_measure,
                min_stock: newMaterial.min_stock,
                max_stock: newMaterial.max_stock,
                current_stock: newMaterial.current_stock,
                location: newMaterial.location,
                process: newMaterial.process,
                Area: newMaterial.Area,
                requested_by: newMaterial.requested_by,
                requested_by_position: newMaterial.requested_by_position,
                machine_asset: newMaterial.machine_asset,
                created_by: user ? user.id : null,
                action_type: newMaterial.action_type,
                image_url: uploadedImagePath,
                status: 'active'
            }

            const { data, error } = await supabase
                .from('materials')
                .insert([materialToCreate])
                .select('*')

            if (error) throw error

            const newItem = data[0]
            if (newItem.image_url) {
                const { data: signed } = await supabase.storage.from('material-images').createSignedUrl(newItem.image_url, 3600)
                newItem.signed_image_url = signed?.signedUrl
            }

            // LOG CREATION EVENT
            await supabase.from('material_events').insert({
                material_id: newItem.id,
                event_type: 'CREATION',
                performed_by: user ? user.id : null,
                notes: 'Initial creation of material',
                modifier_name: newMaterial.requested_by || 'System', // Use requestor as initial modifier contact
                modifier_position: newMaterial.requested_by_position,
                modifier_area: newMaterial.Area,
                chinese_authorizer_name: null,
                evidence_image_path: uploadedImagePath
            })

            setMaterials([newItem, ...materials])
            setIsModalOpen(false)
            setNewMaterial({
                part_number: '',
                name: '',
                description: '',
                category: 'General',
                material_type: 'spare_part',
                abc_class: 'B',
                origin_country: 'MX',
                unit_of_measure: 'unit',
                min_stock: 5,
                max_stock: 100,
                current_stock: 0,
                location: '',
                process: '',
                Area: '',
                requested_by: '',
                requested_by_position: '',
                machine_asset: '',
                image_file: null,
                action_type: 'Alta'
            })
        } catch (error) {
            console.error(error)
            alert('Error creating material: ' + error.message)
            setUploading(false)
        }
    }

    const handleDeactivateSubmit = async () => {
        if (!selectedDeactivateItem || !deactivationReason.trim()) {
            alert("Please select an item and provide a reason.");
            return;
        }

        if (!authChinese.trim() || !authMexican.trim() || !authTechnical.trim()) {
            alert("Please provide names for all 3 authorizations (Chinese, Mexican, Technical).");
            return;
        }

        try {
            setUploading(true)
            const { data: { user } } = await supabase.auth.getUser()

            // Call the database function to move to archive and delete from materials
            const { error } = await supabase
                .rpc('archive_material_transaction', {
                    p_material_id: selectedDeactivateItem.id,
                    p_reason: deactivationReason,
                    p_user_id: user.id,
                    p_auth_chinese: authChinese,
                    p_auth_mexican: authMexican,
                    p_auth_technical: authTechnical
                })

            if (error) throw error

            // Update Local State: Remove item from list
            setMaterials(materials.filter(m => m.id !== selectedDeactivateItem.id))

            // Reset & Close
            setIsDeactivateModalOpen(false)
            setSelectedDeactivateItem(null)
            setDeactivationReason('')
            setDeactivateSearch('')
            setAuthChinese('')
            setAuthMexican('')
            setAuthTechnical('')
            alert("Material archived and removed from active inventory successfully.")

        } catch (error) {
            console.error('Error archiving:', error)
            alert('Error processing archive: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleToggleStatus = async (item) => {
        if (item.status === 'active') {
            handleDeactivate(item);
        } else {
            if (!confirm('Are you sure you want to REACTIVATE this item?')) return;

            const reason = prompt("Enter reason for reactivation (Required):");
            if (reason === null) return;
            if (!reason.trim()) {
                alert("A reason is required to reactivate an item.");
                return;
            }

            try {
                const { data: { user } } = await supabase.auth.getUser()
                const { error } = await supabase
                    .from('materials')
                    .update({
                        status: 'active',
                        deactivated_at: null,
                        deactivated_by: null,
                        deactivation_reason: null
                    })
                    .eq('id', item.id)

                if (error) throw error

                setMaterials(materials.map(m => m.id === item.id ? { ...m, status: 'active' } : m))

                await supabase.from('material_events').insert({
                    material_id: item.id,
                    event_type: 'REACTIVATED',
                    performed_by: user.id,
                    notes: reason
                })
            } catch (error) {
                console.error('Error activating:', error)
                alert('Error activating material')
            }
        }
    }

    const handleDeactivate = async (item) => {
        if (!confirm("Are you sure you want to deactivate this item?")) return;

        const reason = prompt("Enter reason for deactivation (Required):");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("A reason is required to deactivate an item.");
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('materials')
                .update({
                    status: 'inactive',
                    deactivated_at: new Date(),
                    deactivated_by: user.email,
                    deactivation_reason: reason
                })
                .eq('id', item.id)

            if (error) throw error

            setMaterials(materials.map(m => m.id === item.id ? { ...m, status: 'inactive' } : m))

            await supabase.from('material_events').insert({
                material_id: item.id,
                event_type: 'DEACTIVATED',
                performed_by: user.id,
                notes: reason
            })
        } catch (error) {
            console.error('Error deactivating:', error)
            alert('Error deactivating material')
        }
    }

    const clearFilters = () => {
        setSearchTerm('')
        setFilterStatus('all')
        setFilterCategory('all')
        setFilterType('all')
        setFilterABC('all')
        setFilterOrigin('all')
        setFilterProcess('all')
        setFilterArea('all')
        setFilterRequestedBy('')
        setFilterMachine('all')
        setFilterAction('all')
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Unified Header & Toolbar - Full Width Banner - Fixed */}
            <div className="bg-primary-900 shadow-md z-30 shrink-0" style={{ backgroundColor: '#1e3a8a' }}>
                <div className="relative px-8 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="w-80 flex flex-col items-center">
                        <img src="/wasion_logo_large.png" alt="Wasion Logo" className="w-full object-contain" />
                        <div className="text-white text-[10px] font-bold tracking-[0.8em] uppercase opacity-90 mt-0 text-center w-full leading-none">
                            Made in Mexico
                        </div>
                    </div>

                    {/* User Profile Section - Large Photo & Name - Center aligned absolutely */}
                    {(userProfile || currentUser) && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4 bg-primary-800/40 rounded-full pr-6 pl-2 py-1.5 border border-primary-700/50 shadow-sm">
                            <div className="h-12 w-12 rounded-full ring-2 ring-white/20 overflow-hidden bg-primary-700 flex items-center justify-center shrink-0">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-7 w-7 text-primary-300" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm tracking-wide leading-tight">
                                    {userProfile?.full_name || currentUser?.email?.split('@')[0] || 'User'}
                                </span>
                                <span className="text-primary-300 text-[10px] font-medium uppercase tracking-wider">
                                    {userRole || 'User'}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="text-center">
                        <h1 className="text-2xl font-extrabold text-white tracking-widest leading-tight uppercase">
                            Material Master
                        </h1>
                        <p className="text-primary-200 mt-0 text-sm font-medium tracking-wide">Track items, stock levels, and locations.</p>
                    </div>
                </div>

                {/* Toolbar inside Header */}
                <div className="px-8 pb-2 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-primary-800/50 mt-1">
                    <div className="relative max-w-xs w-full mt-1">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Search className="h-3.5 w-3.5 text-primary-300" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search materials..."
                            className="pl-8 py-1 block w-full rounded-md border-transparent bg-primary-800/50 text-white placeholder-primary-400 text-xs focus:border-primary-500 focus:ring-primary-500 focus:bg-primary-800 transition-all shadow-inner h-8"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {!isArchiveView && (
                            <>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center justify-center gap-1.5 bg-white text-primary-900 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-all text-xs font-bold shadow-lg transform hover:-translate-y-0.5 border border-primary-100"
                                >
                                    <Plus size={14} strokeWidth={3} />
                                    New Item
                                </button>
                                {/* Baja Button */}
                                <button
                                    onClick={() => setIsDeactivateModalOpen(true)}
                                    className="flex items-center justify-center gap-1.5 bg-white text-rose-700 px-3 py-1.5 rounded-md hover:bg-rose-50 transition-all text-xs font-bold shadow-lg transform hover:-translate-y-0.5 border border-rose-100"
                                >
                                    <Minus size={14} strokeWidth={3} />
                                    Deactivate Item
                                </button>
                            </>
                        )}

                        <div className="bg-primary-800/50 text-white px-3 py-1.5 rounded-md text-xs font-medium border border-primary-700/50 shadow-sm backdrop-blur-sm">
                            Total: <span className="font-bold ml-1 text-primary-100">{filteredMaterials.length}</span>
                        </div>

                        <button
                            onClick={clearFilters}
                            className="bg-primary-800 hover:bg-primary-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-transparent shadow-sm"
                        >
                            Clear Filters
                        </button>

                        {/* Archive Toggle */}
                        <button
                            onClick={() => setIsArchiveView(!isArchiveView)}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm border",
                                isArchiveView
                                    ? "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200"
                                    : "bg-primary-800 text-primary-200 border-transparent hover:bg-primary-700 hover:text-white"
                            )}
                        >
                            <History size={14} />
                            {isArchiveView ? "Exit Archive" : "View Archive"}
                        </button>
                    </div>
                </div>
            </div>



            {/* Table with Integrated Filters - Full Width - Scrollable Area */}
            <div className="flex-1 p-0 overflow-auto relative">
                <div className="bg-white shadow-none border-t border-slate-200 min-h-full">

                    <div className="">
                        <table className="w-full text-center text-[10px]">
                            <thead className="bg-primary-600 text-white font-medium shadow-sm sticky top-0 z-20 text-[10px] uppercase tracking-wider">
                                <tr>

                                    <th className="px-6 py-1 align-top min-w-[200px] text-center">
                                        Part Number / Name
                                    </th>
                                    <th className="px-6 py-1 align-top w-24">
                                        <div className="flex flex-col gap-1">
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all" className="text-slate-900">Category</option>
                                                {[...new Set(materials.map(m => m?.category).filter(Boolean))].sort().map(cat => (
                                                    <option key={cat} value={cat} className="text-slate-900">{cat}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={filterType}
                                                onChange={(e) => setFilterType(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all" className="text-slate-900">Type</option>
                                                <option value="spare_part" className="text-slate-900">Spare Part</option>
                                                <option value="consumable" className="text-slate-900">Consumable</option>
                                            </select>
                                        </div>
                                    </th>
                                    <th className="px-6 py-1 align-top min-w-[160px]">
                                        <div className="flex flex-col gap-1">
                                            <select
                                                value={filterProcess}
                                                onChange={(e) => setFilterProcess(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all" className="text-slate-900">Process</option>
                                                {[...new Set(materials.map(m => m?.process).filter(Boolean))].sort().map(proc => (
                                                    <option key={proc} value={proc} className="text-slate-900">{proc}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={filterArea}
                                                onChange={(e) => setFilterArea(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all" className="text-slate-900">Area</option>
                                                {[...new Set(materials.map(m => m?.Area).filter(Boolean))].sort().map(area => (
                                                    <option key={area} value={area} className="text-slate-900">{area}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </th>
                                    <th className="px-6 py-1 align-top min-w-[150px]">
                                        <select
                                            value={filterMachine}
                                            onChange={(e) => setFilterMachine(e.target.value)}
                                            className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer"
                                        >
                                            <option value="all">Machine / Asset</option>
                                            {[...new Set(materials.map(m => m?.machine_asset).filter(Boolean))].sort().map(asset => (
                                                <option key={asset} value={asset} className="text-slate-900">{asset}</option>
                                            ))}
                                        </select>
                                    </th>
                                    <th className="px-6 py-1 align-top w-24">
                                        {isArchiveView ? (
                                            <span className="block py-1">Archive Reason</span>
                                        ) : (
                                            <select
                                                value={filterAction}
                                                onChange={(e) => setFilterAction(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all">Action</option>
                                                {[...new Set(materials.map(m => m?.action_type).filter(Boolean))].sort().map(action => (
                                                    <option key={action} value={action} className="text-slate-900">{action}</option>
                                                ))}
                                            </select>
                                        )}
                                    </th>
                                    <th className="px-6 py-1 align-top min-w-[140px]">
                                        <div className="flex flex-col gap-1">
                                            <select
                                                value={filterABC}
                                                onChange={(e) => setFilterABC(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all" className="text-slate-900">Class</option>
                                                <option value="A" className="text-slate-900">A</option>
                                                <option value="B" className="text-slate-900">B</option>
                                                <option value="C" className="text-slate-900">C</option>
                                            </select>
                                            <select
                                                value={filterOrigin}
                                                onChange={(e) => setFilterOrigin(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                            >
                                                <option value="all" className="text-slate-900">Origin</option>
                                                <option value="MX" className="text-slate-900">MX</option>
                                                <option value="CN" className="text-slate-900">CN</option>
                                                <option value="US" className="text-slate-900">US</option>
                                            </select>
                                        </div>
                                    </th>
                                    <th className="px-6 py-1 align-top min-w-[260px]">
                                        {isArchiveView ? (
                                            <span className="block py-1">Authorizations</span>
                                        ) : (
                                            <span>Stock</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-1 align-top w-32">
                                        <input
                                            type="text"
                                            value={filterRequestedBy}
                                            onChange={(e) => setFilterRequestedBy(e.target.value)}
                                            placeholder="Requested By"
                                            className="w-full bg-transparent border-none p-0 text-[10px] font-medium placeholder-white text-white focus:ring-0 text-center"
                                        />
                                    </th>
                                    <th className="px-6 py-1 align-top min-w-[140px]">
                                        {isArchiveView ? (
                                            <span className="block py-1">Archived At</span>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <select
                                                    value={filterStatus}
                                                    onChange={(e) => setFilterStatus(e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-white focus:ring-0 cursor-pointer text-center"
                                                >
                                                    <option value="all">Status</option>
                                                    <option value="active" className="text-slate-900">Active</option>
                                                    <option value="inactive" className="text-slate-900">Inactive</option>
                                                </select>
                                            </div>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="animate-spin" size={20} /> Loading inventory...
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-12 text-center text-red-600 bg-red-50">
                                            <div className="flex flex-col items-center gap-2">
                                                <AlertCircle size={24} />
                                                <span className="font-medium">Error loading inventory</span>
                                                <span className="text-sm">{error}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredMaterials.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-slate-500">No materials found.</td>
                                    </tr>
                                ) : (
                                    filteredMaterials.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={clsx(
                                                "group transition-colors border-b border-slate-100 last:border-none",
                                                item.current_stock < item.min_stock ? "bg-red-50 hover:bg-red-100" :
                                                    item.current_stock === item.min_stock ? "bg-amber-50 hover:bg-amber-100" :
                                                        "odd:bg-white even:bg-slate-50 hover:bg-blue-50/50"
                                            )}
                                        >

                                            <td
                                                className="px-6 py-2.5 align-middle cursor-pointer hover:bg-indigo-50/50 transition-colors group-hover/text:text-indigo-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRowClick(item);
                                                }}
                                                title="Click to view details"
                                            >
                                                <div className="font-bold text-slate-800 text-[11px] hover:text-indigo-700 transition-colors underline decoration-dotted decoration-slate-300 underline-offset-2">{item.part_number}</div>
                                                <div className="text-slate-500 text-[9px] mt-0.5">{item.name}</div>
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                <div className="text-slate-700 font-medium text-[11px]">{item.category}</div>
                                                <span className={clsx(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider mt-1 border",
                                                    item.material_type === 'consumable'
                                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                                )}>
                                                    {item.material_type === 'consumable' ? 'Consumable' : 'Spare Part'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                <div className="text-[11px] font-medium text-slate-700">{item.process || '-'}</div>
                                                <div className="text-[9px] text-slate-400 mt-0.5">{item.Area || '-'}</div>
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                <div className="text-[11px] text-slate-600">{item.machine_asset || '-'}</div>
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                {isArchiveView ? (
                                                    <span className="text-[10px] text-rose-700 font-medium italic">{item.archive_reason}</span>
                                                ) : (
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[9px] font-medium border border-purple-100">
                                                        {item.action_type || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                <div className="flex gap-2 justify-center">
                                                    <span className={clsx(
                                                        "px-1.5 py-0.5 rounded border text-[9px] font-bold shadow-sm",
                                                        item.abc_class === 'A' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                            item.abc_class === 'B' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                item.abc_class === 'C' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                                    "bg-white text-slate-600 border-slate-200"
                                                    )}>{item.abc_class || '-'}</span>
                                                    <span className="bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[9px] shadow-sm">{item.origin_country || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                {isArchiveView ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-[9px] text-slate-500"><span className="font-bold text-slate-700">CN:</span> {item.auth_chinese_name || '-'}</div>
                                                        <div className="text-[9px] text-slate-500"><span className="font-bold text-slate-700">MX:</span> {item.auth_mexican_name || '-'}</div>
                                                        <div className="text-[9px] text-slate-500"><span className="font-bold text-slate-700">Tech:</span> {item.auth_technical_name || '-'}</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <span className={clsx("font-bold text-[11px]", item.current_stock <= item.min_stock ? "text-red-600" : "text-slate-800")}>
                                                            {item.current_stock} <span className="text-slate-400 text-xs font-normal ml-0.5">{item.unit_of_measure}</span>
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 mt-0.5">
                                                            Min: {item.min_stock} <span className="mx-0.5 text-slate-300">|</span> Max: {item.max_stock}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-2.5 align-middle text-[11px] text-slate-600">
                                                <div className="font-medium text-slate-700">{item.requested_by || '-'}</div>
                                                {item.requested_by_position && <div className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">{item.requested_by_position}</div>}
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                {isArchiveView ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-700">
                                                            {new Date(item.archived_at).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400">
                                                            {new Date(item.archived_at).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleStatus(item);
                                                        }}
                                                        className={clsx(
                                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-sm active:scale-95",
                                                            item.status === 'active'
                                                                ? "bg-white text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300"
                                                                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-500"
                                                        )}
                                                        title={item.status === 'active' ? "Click to Deactivate" : "Click to Reactivate"}
                                                    >
                                                        <span className={clsx("w-2 h-2 rounded-full", item.status === 'active' ? "bg-green-500 animate-pulse" : "bg-slate-300")}></span>
                                                        {item.status === 'active' ? 'Active' : 'Inactive'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Modal - Professional Redesign - Wide Dashboard Style */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
                        <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">

                            {/* Professional Header */}
                            <div className="bg-primary-900 px-8 py-5 flex justify-between items-center shadow-lg shrink-0 relative overflow-hidden">
                                {/* Detailed Pattern Overlay for texture */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="flex flex-col items-center">
                                        <img src="/wasion_logo_large.png" alt="Wasion Mexico" className="h-9 object-contain brightness-0 invert opacity-95" />
                                        <span className="text-white/60 text-[8px] font-bold tracking-[0.25em] uppercase mt-1">Made in Mexico</span>
                                    </div>

                                    <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block"></div>

                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                                            <Plus className="bg-white/20 p-1 rounded-full backdrop-blur-sm" size={24} strokeWidth={3} />
                                            New Material Entry
                                        </h2>
                                        <p className="text-primary-200 text-xs mt-0.5 font-medium pl-9 opacity-80">Register a new item in the master inventory.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all relative z-10"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="overflow-y-auto p-8 flex-1 bg-slate-50/50">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                    {/* Left Column: Image & Key Classifiers - Sticky on large screens */}
                                    <div className="lg:col-span-3 space-y-6">
                                        {/* Image Upload Card */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                            <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center gap-2.5">
                                                <div className="bg-white text-primary-700 p-1.5 rounded-md shadow-sm ring-1 ring-black/5">
                                                    <Package size={16} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs font-bold text-primary-900 uppercase tracking-widest">Part Image</span>
                                            </div>
                                            <div className="p-5">
                                                <div className="border-2 border-dashed border-slate-300 rounded-xl aspect-square flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-primary-400 transition-all cursor-pointer relative group bg-slate-50/50">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setNewMaterial({ ...newMaterial, image_file: e.target.files[0] })}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    {newMaterial.image_file ? (
                                                        <div className="relative w-full h-full p-2">
                                                            <img src={URL.createObjectURL(newMaterial.image_file)} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-lg backdrop-blur-sm">
                                                                <UploadCloud className="text-white mb-2" size={24} />
                                                                <span className="text-white text-xs font-bold uppercase tracking-wider">Change Image</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 flex flex-col items-center">
                                                            <div className="bg-white border border-slate-200 text-primary-500 rounded-2xl p-4 mb-3 group-hover:scale-110 group-hover:text-primary-600 group-hover:border-primary-200 transition-all shadow-sm">
                                                                <UploadCloud size={32} strokeWidth={1.5} />
                                                            </div>
                                                            <p className="text-xs text-slate-600 font-bold uppercase tracking-wide">Drag or Click</p>
                                                            <span className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Critical Classifiers Panel */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                            <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center gap-2.5">
                                                <div className="bg-white text-primary-700 p-1.5 rounded-md shadow-sm ring-1 ring-black/5">
                                                    <Tag size={16} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs font-bold text-primary-900 uppercase tracking-widest">Classification</span>
                                            </div>
                                            <div className="p-5 space-y-5">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Material Type</label>
                                                    <div className="flex gap-2">
                                                        {['spare_part', 'consumable'].map((type) => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setNewMaterial({ ...newMaterial, material_type: type })}
                                                                className={clsx(
                                                                    "flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase transition-all border shadow-sm",
                                                                    newMaterial.material_type === type
                                                                        ? (type === 'consumable' ? "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-200" : "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200")
                                                                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                                                )}
                                                            >
                                                                {type === 'consumable' ? 'Consumable' : 'Spare Part'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Action</label>
                                                    <select
                                                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all cursor-pointer hover:bg-white"
                                                        value={newMaterial.action_type || 'Alta'}
                                                        onChange={e => setNewMaterial({ ...newMaterial, action_type: e.target.value })}
                                                    >
                                                        <option value="Alta">New Entry</option>
                                                        <option value="Modificación">Modification</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ABC Classification</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['A', 'B', 'C'].map((cls) => (
                                                            <button
                                                                key={cls}
                                                                type="button"
                                                                onClick={() => setNewMaterial({ ...newMaterial, abc_class: cls })}
                                                                className={clsx(
                                                                    "py-2 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                                                    newMaterial.abc_class === cls
                                                                        ? (cls === 'A' ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200" :
                                                                            cls === 'B' ? "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200" :
                                                                                "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200")
                                                                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                                                )}
                                                            >
                                                                {cls}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Right Column: Main Form Data */}
                                    <div className="lg:col-span-9 space-y-6">

                                        {/* Section: Part Information */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                            <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center gap-2.5">
                                                <div className="bg-white text-primary-700 p-1.5 rounded-md shadow-sm ring-1 ring-black/5">
                                                    <Box size={16} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs font-bold text-primary-900 uppercase tracking-widest">Part Information</span>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Part Number <span className="text-red-500">*</span></label>
                                                    <input
                                                        required
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all placeholder:text-slate-400 font-mono text-slate-800 focus:bg-white hover:bg-white"
                                                        value={newMaterial.part_number}
                                                        onChange={e => setNewMaterial({ ...newMaterial, part_number: e.target.value })}
                                                        placeholder="EX: DRILL-001-X"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Category <span className="text-red-500">*</span></label>
                                                    <input
                                                        required
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all placeholder:text-slate-400 focus:bg-white hover:bg-white"
                                                        value={newMaterial.category}
                                                        onChange={e => setNewMaterial({ ...newMaterial, category: e.target.value })}
                                                        placeholder="Ex: Cutting Tools"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Name / Short Description <span className="text-red-500">*</span></label>
                                                    <input
                                                        required
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 focus:bg-white hover:bg-white"
                                                        value={newMaterial.name}
                                                        onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })}
                                                        placeholder="Ex: High Speed Drill Bit 1/2 Inch"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Detailed Description <span className="text-red-500">*</span></label>
                                                    <textarea
                                                        required
                                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all placeholder:text-slate-400 min-h-[80px] text-slate-600 focus:bg-white hover:bg-white resize-y"
                                                        value={newMaterial.description}
                                                        onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })}
                                                        placeholder="Technical specifications, compatibility, special notes..."
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Inventory & Location */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Inventory Control */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full group hover:shadow-md transition-shadow">
                                                <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center gap-2.5">
                                                    <div className="bg-white text-primary-700 p-1.5 rounded-md shadow-sm ring-1 ring-black/5">
                                                        <ClipboardList size={16} strokeWidth={2.5} />
                                                    </div>
                                                    <span className="text-xs font-bold text-primary-900 uppercase tracking-widest">Inventory Control</span>
                                                </div>
                                                <div className="p-6 grid grid-cols-2 gap-5">
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Unit of Measure</label>
                                                        <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:bg-white uppercase focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-bold text-slate-700" value={newMaterial.unit_of_measure} onChange={e => setNewMaterial({ ...newMaterial, unit_of_measure: e.target.value })} placeholder="PCS" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Initial Stock</label>
                                                        <input type="number" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={newMaterial.current_stock} onChange={e => setNewMaterial({ ...newMaterial, current_stock: parseInt(e.target.value) })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-bold text-amber-600/80 uppercase tracking-wider ml-1 flex items-center gap-1">Min (Reorder)</label>
                                                        <div className="relative">
                                                            <input type="number" required className="w-full p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg text-sm text-center text-amber-800 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all" value={newMaterial.min_stock} onChange={e => setNewMaterial({ ...newMaterial, min_stock: parseInt(e.target.value) })} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-bold text-blue-600/80 uppercase tracking-wider ml-1">Max (Limit)</label>
                                                        <div className="relative">
                                                            <input type="number" required className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg text-sm text-center text-blue-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all" value={newMaterial.max_stock} onChange={e => setNewMaterial({ ...newMaterial, max_stock: parseInt(e.target.value) })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location & Context */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full group hover:shadow-md transition-shadow">
                                                <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center gap-2.5">
                                                    <div className="bg-white text-primary-700 p-1.5 rounded-md shadow-sm ring-1 ring-black/5">
                                                        <MapPin size={16} strokeWidth={2.5} />
                                                    </div>
                                                    <span className="text-xs font-bold text-primary-900 uppercase tracking-widest">Location & Context</span>
                                                </div>
                                                <div className="p-6 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Physical Location <span className="text-red-500">*</span></label>
                                                            <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-mono text-slate-700" value={newMaterial.location} onChange={e => setNewMaterial({ ...newMaterial, location: e.target.value })} placeholder="A1-05" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Machine / Asset <span className="text-red-500">*</span></label>
                                                            <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={newMaterial.machine_asset} onChange={e => setNewMaterial({ ...newMaterial, machine_asset: e.target.value })} placeholder="CNC-01" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Process <span className="text-red-500">*</span></label>
                                                            <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={newMaterial.process} onChange={e => setNewMaterial({ ...newMaterial, process: e.target.value })} placeholder="Machining" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Area <span className="text-red-500">*</span></label>
                                                            <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={newMaterial.Area} onChange={e => setNewMaterial({ ...newMaterial, Area: e.target.value })} placeholder="Bay 3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Request Info */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                            <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center gap-2.5">
                                                <div className="bg-white text-primary-700 p-1.5 rounded-md shadow-sm ring-1 ring-black/5">
                                                    <User size={16} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs font-bold text-primary-900 uppercase tracking-widest">Request Information</span>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Origin / Country</label>
                                                    <select
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all cursor-pointer text-slate-700"
                                                        value={newMaterial.origin_country}
                                                        onChange={e => setNewMaterial({ ...newMaterial, origin_country: e.target.value })}
                                                    >
                                                        <option value="MX">Mexico (MX)</option>
                                                        <option value="CN">China (CN)</option>
                                                        <option value="US">USA (US)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Requested By <span className="text-red-500">*</span></label>
                                                    <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={newMaterial.requested_by} onChange={e => setNewMaterial({ ...newMaterial, requested_by: e.target.value })} placeholder="Full Name" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Position <span className="text-red-500">*</span></label>
                                                    <input required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={newMaterial.requested_by_position} onChange={e => setNewMaterial({ ...newMaterial, requested_by_position: e.target.value })} placeholder="Ex: Shift Supervisor" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Footer Actions */}
                            <div className="p-5 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-lg border border-transparent transition-all uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={uploading}
                                    className="px-8 py-2.5 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all flex items-center gap-2.5 uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {uploading ? (
                                        <><Loader2 className="animate-spin" size={16} /> Processing...</>
                                    ) : (
                                        <><Check size={18} strokeWidth={3} /> Save Item</>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div >
                )
                }
            </div >

            {/* Deactivation Modal */}
            {isDeactivateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="bg-rose-600 px-6 py-4 flex items-center justify-between shrink-0 shadow-md z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md shadow-inner">
                                    <Minus className="text-white" size={20} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight leading-none uppercase">Deactivate Material</h2>
                                    <p className="text-rose-100 text-[10px] font-medium mt-0.5 tracking-wide">Deactivate item from inventory</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDeactivateModalOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Search */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search active material to deactivate</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                        placeholder="Search by part number or name..."
                                        value={deactivateSearch}
                                        onChange={(e) => {
                                            setDeactivateSearch(e.target.value)
                                            setSelectedDeactivateItem(null)
                                        }}
                                    />
                                </div>
                                {/* Results Dropdown (Simple list for now) */}
                                {deactivateSearch && !selectedDeactivateItem && (
                                    <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg mt-1 divide-y divide-slate-100">
                                        {materials.filter(m =>
                                            m.status === 'active' &&
                                            (m.name.toLowerCase().includes(deactivateSearch.toLowerCase()) ||
                                                m.part_number.toLowerCase().includes(deactivateSearch.toLowerCase()))
                                        ).slice(0, 5).map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => {
                                                    setSelectedDeactivateItem(m)
                                                    setDeactivateSearch(m.part_number + ' - ' + m.name)
                                                }}
                                                className="p-3 hover:bg-rose-50 cursor-pointer transition-colors text-xs flex justify-between items-center group"
                                            >
                                                <div>
                                                    <span className="font-bold text-slate-700 block">{m.part_number}</span>
                                                    <span className="text-slate-500 group-hover:text-rose-700">{m.name}</span>
                                                </div>
                                                <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">{m.current_stock} available</div>
                                            </div>
                                        ))}
                                        {materials.filter(m => m.status === 'active' && (m.name.toLowerCase().includes(deactivateSearch.toLowerCase()) || m.part_number.toLowerCase().includes(deactivateSearch.toLowerCase()))).length === 0 && (
                                            <div className="p-3 text-xs text-slate-400 text-center">No active materials found</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected Item Verification */}
                            {selectedDeactivateItem && (
                                <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex gap-4 items-start animate-in fade-in zoom-in-95 duration-200">
                                    {selectedDeactivateItem.signed_image_url ? (
                                        <img src={selectedDeactivateItem.signed_image_url} alt="" className="w-12 h-12 rounded object-cover border border-rose-200" />
                                    ) : (
                                        <div className="w-12 h-12 bg-white rounded border border-rose-200 flex items-center justify-center text-rose-300"><Package size={20} /></div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-rose-900 text-sm">{selectedDeactivateItem.part_number}</h4>
                                        <p className="text-xs text-rose-700 line-clamp-1">{selectedDeactivateItem.name}</p>
                                        <div className="mt-1 flex gap-2">
                                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-600 font-mono">Stock: {selectedDeactivateItem.current_stock}</span>
                                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-600 font-mono">Loc: {selectedDeactivateItem.location}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedDeactivateItem(null); setDeactivateSearch('') }} className="ml-auto text-rose-400 hover:text-rose-600"><X size={16} /></button>
                                </div>
                            )}

                            {/* Reason */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Deactivation <span className="text-red-500">*</span></label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                                    placeholder="Please describe why this item is being deactivated..."
                                    value={deactivationReason}
                                    onChange={(e) => setDeactivationReason(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Authorizations */}
                            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chinese Authorization <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                        placeholder="Name of Chinese Rep"
                                        value={authChinese}
                                        onChange={(e) => setAuthChinese(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mexican Authorization <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                        placeholder="Name of Mexican Staff"
                                        value={authMexican}
                                        onChange={(e) => setAuthMexican(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Technical Authorization <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                        placeholder="Name of Technical Rep"
                                        value={authTechnical}
                                        onChange={(e) => setAuthTechnical(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setIsDeactivateModalOpen(false)}
                                className="px-5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 font-bold text-xs rounded-lg transition-all uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeactivateSubmit}
                                disabled={!selectedDeactivateItem || !deactivationReason.trim() || uploading}
                                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-rose-500/30 transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Minus size={16} strokeWidth={3} />}
                                Confirm Deactivation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Action Modal (History vs Details) */}
            {isActionMenuOpen && selectedItemAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100 transition-all border border-white/20 ring-1 ring-black/5">

                        {/* Branding Header */}
                        <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-white to-orange-400 opacity-50"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                <h3 className="text-3xl font-black tracking-widest text-white font-sans drop-shadow-md">
                                    WASION
                                </h3>
                                <div className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.4em] mt-1 border-t border-blue-400/30 pt-1">
                                    Made in Mexico
                                </div>
                            </div>
                            {/* Decorative Circle */}
                            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Select Action</h3>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Item: <span className="text-slate-700">{selectedItemAction.part_number}</span></p>
                            </div>

                            <div className="p-8 grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleOpenHistory}
                                    className="aspect-square rounded-2xl bg-white border-2 border-slate-50 hover:border-blue-100 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-3 transition-all group shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                        <History className="text-slate-400 group-hover:text-blue-600 transition-colors" size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-widest transition-colors">History</span>
                                </button>

                                <button
                                    onClick={handleOpenDetails}
                                    className="aspect-square rounded-2xl bg-white border-2 border-slate-50 hover:border-blue-100 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-3 transition-all group shadow-sm hover:shadow-md"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                        <ClipboardList className="text-slate-400 group-hover:text-blue-600 transition-colors" size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-widest transition-colors">Details</span>
                                </button>

                                {(userRole === 'admin' || userRole === 'supervisor') && (
                                    <button
                                        onClick={() => {
                                            setIsActionMenuOpen(false)
                                            handleOpenLimitHistory()
                                        }}
                                        className="col-span-2 py-4 rounded-xl bg-white border-2 border-slate-50 hover:border-purple-100 hover:bg-purple-50/50 flex flex-row items-center justify-center gap-3 transition-all group shadow-sm hover:shadow-md"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                                            <History className="text-slate-400 group-hover:text-purple-600 transition-colors" size={16} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-purple-600 uppercase tracking-widest transition-colors">Limit Changes</span>
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setIsActionMenuOpen(false)}
                                className="mt-2 w-full py-3 text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase tracking-[0.2em] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Detail View Modal (Info & History) */}
            {
                isDetailModalOpen && selectedItemAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all duration-300 animate-in fade-in duration-200">
                        <div className={clsx("bg-slate-50/95 rounded-2xl shadow-2xl w-full h-[90vh] overflow-hidden flex flex-col ring-1 ring-black/5 animate-in zoom-in-95 duration-200", detailTab === 'limit_history' ? 'max-w-[95vw]' : 'max-w-6xl')}>

                            {/* Premium Header */}
                            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-8 py-5 flex justify-between items-center shrink-0 shadow-lg relative overflow-hidden group">
                                {/* Animated Texture & Glow Effects */}
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent group-hover:opacity-30 transition-opacity duration-1000"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>

                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="flex flex-col items-center group/logo cursor-default">
                                        <img src="/wasion_logo_large.png" alt="Wasion" className="h-9 object-contain brightness-0 invert opacity-90 group-hover/logo:opacity-100 transition-opacity duration-300" />
                                        <span className="text-blue-200/60 text-[8px] uppercase tracking-[0.35em] mt-1.5 font-bold group-hover/logo:text-blue-200 transition-colors duration-300">ToolCrib System</span>
                                    </div>
                                    <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight leading-none drop-shadow-sm flex items-center gap-3">
                                            {selectedItemAction.name}
                                            <div className={clsx("w-2 h-2 rounded-full animate-pulse", selectedItemAction.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400')}></div>
                                        </h2>
                                        <div className="flex items-center gap-2 mt-2 opacity-80">
                                            <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-blue-100 border border-white/10">{selectedItemAction.part_number}</span>
                                            {selectedItemAction.status === 'inactive' && (
                                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[10px] font-bold border border-rose-500/30 uppercase tracking-wider">Inactive</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="relative z-10 text-slate-400 hover:text-white hover:bg-white/10 p-3 rounded-full transition-all duration-200 group/close"
                                >
                                    <X size={24} className="group-hover/close:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            {/* Modern Tabs */}
                            <div className="flex border-b border-slate-200 bg-white px-8 pt-3 gap-1">
                                <button
                                    onClick={() => setDetailTab('info')}
                                    className={clsx(
                                        "px-8 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-[3px] flex items-center gap-2.5 hover:bg-slate-50 rounded-t-lg mb-[-1px]",
                                        detailTab === 'info'
                                            ? "border-blue-600 text-blue-900 bg-slate-50/50"
                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"
                                    )}
                                >
                                    <ClipboardList size={18} className={detailTab === 'info' ? "text-blue-600" : "text-slate-400"} strokeWidth={detailTab === 'info' ? 2.5 : 2} />
                                    Overview
                                </button>
                                <button
                                    onClick={() => setDetailTab('history')}
                                    className={clsx(
                                        "px-8 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-[3px] flex items-center gap-2.5 hover:bg-slate-50 rounded-t-lg mb-[-1px]",
                                        detailTab === 'history'
                                            ? "border-orange-500 text-slate-900 bg-slate-50/50"
                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"
                                    )}
                                >
                                    <History size={18} className={detailTab === 'history' ? "text-orange-500" : "text-slate-400"} strokeWidth={detailTab === 'history' ? 2.5 : 2} />
                                    History Log
                                </button>
                                {/* Limit History Tab (Only for Admins/Supervisors? or All? User said "agregar la otra pestaña" generally. Consistent with History Button logic.) */}
                                <button
                                    onClick={() => {
                                        setDetailTab('limit_history')
                                        handleOpenLimitHistory()
                                    }}
                                    className={clsx(
                                        "px-8 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-[3px] flex items-center gap-2.5 hover:bg-slate-50 rounded-t-lg mb-[-1px]",
                                        detailTab === 'limit_history'
                                            ? "border-purple-600 text-slate-900 bg-slate-50/50"
                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"
                                    )}
                                >
                                    ```
                                    <History size={18} className={detailTab === 'limit_history' ? "text-purple-600" : "text-slate-400"} strokeWidth={detailTab === 'limit_history' ? 2.5 : 2} />
                                    Limit History
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto bg-slate-100/50 p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                {detailTab === 'info' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Left: Image & Quick Stats */}
                                        <div className="lg:col-span-4 space-y-6">
                                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm aspect-square flex items-center justify-center overflow-hidden relative group">
                                                {selectedItemAction.signed_image_url ? (
                                                    <img
                                                        src={selectedItemAction.signed_image_url}
                                                        alt={selectedItemAction.name}
                                                        className="w-full h-full object-contain cursor-zoom-in transition-transform group-hover:scale-105 duration-500"
                                                        onClick={() => setPreviewImage(selectedItemAction.signed_image_url)}
                                                    />
                                                ) : (
                                                    <div className="text-slate-300 flex flex-col items-center">
                                                        <Package size={64} strokeWidth={1} />
                                                        <span className="text-[10px] mt-2 font-bold uppercase tracking-widest text-slate-400">No Image Available</span>
                                                    </div>
                                                )}
                                                {selectedItemAction.signed_image_url && (
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                                                )}
                                            </div>

                                            {/* Quick Actions Card */}
                                            <div className="bg-white rounded-xl border-t-4 border-orange-500 shadow-sm p-4">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Stats</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                                                        <span className="block text-xl font-bold text-primary-700">{selectedItemAction.current_stock}</span>
                                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider">Current Stock</span>
                                                    </div>
                                                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                                                        <span className={clsx(
                                                            "block text-xl font-bold",
                                                            selectedItemAction.status === 'active' ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            {selectedItemAction.status === 'active' ? 'Active' : 'Inactive'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider">Status</span>
                                                    </div>
                                                </div>

                                                {/* Stock Meter with Edit */}
                                                <div className="mt-6 border-t border-slate-100 pt-4">
                                                    <div className="flex justify-between items-end text-[9px] font-bold text-slate-400 uppercase mb-2 px-1">
                                                        <div className="flex gap-4">
                                                            <span>Min: <span className="text-slate-700">{selectedItemAction.min_stock}</span></span>
                                                            <span>Max: <span className="text-slate-700">{selectedItemAction.max_stock}</span></span>
                                                        </div>
                                                        {(userRole === 'admin' || userRole === 'supervisor') && (
                                                            <button
                                                                onClick={handleOpenEditLimits}
                                                                className="text-[9px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                                                            >
                                                                Modification
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                                                        <div
                                                            className={clsx("h-full rounded-full transition-all duration-500 ease-out", selectedItemAction.current_stock <= selectedItemAction.min_stock ? "bg-rose-500" : "bg-emerald-500")}
                                                            style={{ width: `${Math.min(100, Math.max(0, (selectedItemAction.current_stock / selectedItemAction.max_stock) * 100))}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Data */}
                                        <div className="lg:col-span-8 space-y-6">

                                            {/* Technical Details */}
                                            <div className="bg-white rounded-xl border-t-4 border-primary-600 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                                    <Tag size={14} className="text-primary-600" />
                                                    <span className="font-bold text-xs text-primary-900 uppercase tracking-widest">Technical Details</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-6 gap-x-8 p-6">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Category</label>
                                                        <div className="text-sm font-semibold text-slate-700">{selectedItemAction.category}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Material Type</label>
                                                        <span className={clsx(
                                                            "inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                            selectedItemAction.material_type === 'consumable' ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                                        )}>
                                                            {selectedItemAction.material_type === 'consumable' ? 'Consumable' : 'Spare Part'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">ABC Classification</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-black border shadow-sm",
                                                                selectedItemAction.abc_class === 'A' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                    selectedItemAction.abc_class === 'B' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                        "bg-rose-50 text-rose-700 border-rose-200"
                                                            )}>
                                                                {selectedItemAction.abc_class}
                                                            </span>
                                                            <span className="text-xs text-slate-500 italic">
                                                                {selectedItemAction.abc_class === 'A' ? 'High value / usage' : selectedItemAction.abc_class === 'B' ? 'Moderate value / usage' : 'Low value / usage'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Origin</label>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{selectedItemAction.origin_country === 'MX' ? '🇲🇽' : selectedItemAction.origin_country === 'CN' ? '🇨🇳' : selectedItemAction.origin_country === 'US' ? '🇺🇸' : '🏳️'}</span>
                                                            <span className="text-sm font-medium text-slate-700">{selectedItemAction.origin_country}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location & Usage */}
                                            <div className="bg-white rounded-xl border-t-4 border-primary-600 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                                    <MapPin size={14} className="text-primary-600" />
                                                    <span className="font-bold text-xs text-primary-900 uppercase tracking-widest">Location & Usage</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-6 gap-x-8 p-6">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Physical Location</label>
                                                        <div className="text-sm font-bold text-slate-700 font-mono bg-slate-50 inline-block px-3 py-1.5 rounded border border-slate-200 shadow-sm">
                                                            {selectedItemAction.location}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Machine / Asset</label>
                                                        <div className="text-sm font-medium text-slate-700">{selectedItemAction.machine_asset || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Process</label>
                                                        <div className="text-sm font-medium text-slate-700">{selectedItemAction.process || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Area</label>
                                                        <div className="text-sm font-medium text-slate-700">{selectedItemAction.Area || '-'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Registry & Traceability */}
                                            <div className="bg-white rounded-xl border-t-4 border-purple-600 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                                    <History size={14} className="text-purple-600" />
                                                    <span className="font-bold text-xs text-primary-900 uppercase tracking-widest">Registry & Traceability</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Registered By</label>
                                                        <div className="text-sm font-semibold text-slate-700 break-words">{selectedItemAction.registered_by || 'System'}</div>
                                                        <div className="text-[10px] text-slate-400">Technician</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Date</label>
                                                        <div className="text-sm font-semibold text-slate-700">{selectedItemAction.created_at ? new Date(selectedItemAction.created_at).toLocaleDateString() : '-'}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Requestor</label>
                                                        <div className="text-sm font-semibold text-slate-700">{selectedItemAction.requested_by || '-'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                                    <ClipboardList size={14} className="text-slate-500" />
                                                    <span className="font-bold text-xs text-primary-900 uppercase tracking-widest">Detailed Description</span>
                                                </div>
                                                <div className="p-6 text-sm text-slate-600 leading-relaxed">
                                                    {selectedItemAction.description || <span className="text-slate-400 italic">No detailed description provided.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : detailTab === 'limit_history' ? (
                                    <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
                                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-purple-100/50 p-2.5 rounded-xl text-purple-600 shadow-sm border border-purple-100">
                                                    <History size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Limit Audit</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Track min/max stock changes</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                                                {limitHistory.length} Record{limitHistory.length !== 1 && 's'} Found
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto flex-1">
                                            {limitHistory.length > 0 ? (
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                                            <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Timestamp</th>
                                                            <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-56">Modifier / Area</th>
                                                            <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Authorization</th>
                                                            <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Changes Details</th>
                                                            <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Auth Doc</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {limitHistory && Array.isArray(limitHistory) && limitHistory.map((event) => {
                                                            if (!event) return null;
                                                            return (
                                                                <tr key={event.id || Math.random()} className="hover:bg-purple-50/30 transition-colors group">
                                                                    <td className="px-4 py-4 text-[10px] text-slate-600 font-mono whitespace-nowrap align-top">
                                                                        <div className="font-bold text-slate-700">{new Date(event.created_at).toLocaleDateString()}</div>
                                                                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(event.created_at).toLocaleTimeString()}</div>
                                                                    </td>
                                                                    <td className="px-4 py-4 align-top">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-100 to-white text-slate-500 flex items-center justify-center text-[9px] font-black border border-slate-200 shadow-sm">
                                                                                    {(event.modifier_name || event.profiles?.email || '?').charAt(0).toUpperCase()}
                                                                                </div>
                                                                                <span className="text-[11px] font-bold text-slate-800">{event.modifier_name || event.profiles?.email || 'Unknown'}</span>
                                                                            </div>
                                                                            {(event.modifier_position || event.modifier_area) && (
                                                                                <div className="pl-8 text-[9px] text-slate-500 flex flex-col">
                                                                                    {event.modifier_position && <span><span className="font-semibold text-slate-400">Pos:</span> {event.modifier_position}</span>}
                                                                                    {event.modifier_area && <span><span className="font-semibold text-slate-400">Area:</span> {event.modifier_area}</span>}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-4 align-top">
                                                                        {event.chinese_auth ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                                                                                    <Check size={10} strokeWidth={3} />
                                                                                    Authorized
                                                                                </span>
                                                                                <div className="text-[10px] text-slate-600 font-medium pl-1">
                                                                                    By: <span className="text-slate-800 font-bold">{event.chinese_authorizer}</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[9px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block">
                                                                                Not Required
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-4 align-top">
                                                                        <div className="flex flex-col gap-2">
                                                                            {/* Parse and Render Notes with Rich UI */}
                                                                            {event.notes ? (() => {
                                                                                const safeNotes = String(event.notes || '');
                                                                                const notesList = safeNotes.split(', ');

                                                                                // Robust Justification Extraction
                                                                                let justification = notesList.find(n => n.startsWith('Justification:'));
                                                                                if (justification) {
                                                                                    justification = justification.replace('Justification: ', '');
                                                                                } else {
                                                                                    // Fallback: Use the last item if it's not a known key (likely a loose comment)
                                                                                    const isKey = (s) => s.startsWith('Min:') || s.startsWith('Max:') || s.startsWith('Requestor:') || s.startsWith('Position:') || s.startsWith('Evidence:') || s.startsWith('Chinese Auth:') || s.startsWith('Auth By:');
                                                                                    const looseParams = notesList.filter(n => !isKey(n));
                                                                                    if (looseParams.length > 0) justification = looseParams.join(', ');
                                                                                }

                                                                                // Clean Changes List
                                                                                const changes = notesList.filter(n =>
                                                                                    !n.startsWith('Justification:') &&
                                                                                    !n.startsWith('Evidence:') &&
                                                                                    !n.startsWith('Chinese Auth:') &&
                                                                                    !n.startsWith('Auth By:') &&
                                                                                    (justification ? n !== justification && n !== `Justification: ${justification}` : true)
                                                                                );

                                                                                return (
                                                                                    <>
                                                                                        {/* 1. Value Changes (Chips) */}
                                                                                        {changes.length > 0 && (
                                                                                            <div className="flex flex-wrap gap-1.5 mb-1">
                                                                                                {changes.map((change, idx) => {
                                                                                                    const isMin = change.startsWith('Min:');
                                                                                                    const isMax = change.startsWith('Max:');
                                                                                                    const isReq = change.startsWith('Requestor:');

                                                                                                    let styleClass = "bg-slate-100 text-slate-600 border-slate-200";
                                                                                                    if (isMin) styleClass = "bg-blue-50 text-blue-700 border-blue-100";
                                                                                                    if (isMax) styleClass = "bg-orange-50 text-orange-700 border-orange-100";
                                                                                                    if (isReq) styleClass = "bg-purple-50 text-purple-700 border-purple-100";

                                                                                                    return (
                                                                                                        <span key={idx} className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${styleClass}`}>
                                                                                                            {change}
                                                                                                        </span>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 2. Justification (Featured Block) */}
                                                                                        {justification && (
                                                                                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2">
                                                                                                <div className="text-[9px] font-bold text-amber-600/80 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                                                                                                    <Info size={10} strokeWidth={3} />
                                                                                                    Justification
                                                                                                </div>
                                                                                                <div className="text-[10px] text-slate-700 font-medium leading-relaxed italic">
                                                                                                    "{justification}"
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })() : <span className="text-slate-400 italic text-[10px]">-</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-4 align-middle text-center">
                                                                        {event.evidence_image_path ? (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const url = event.evidence_image_path.startsWith('http')
                                                                                        ? event.evidence_image_path
                                                                                        : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/audit-evidence/${event.evidence_image_path}`;
                                                                                    setPreviewImage(url);
                                                                                }}
                                                                                className="group/btn relative inline-flex items-center justify-center w-12 h-10 overflow-hidden rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
                                                                            >
                                                                                <div className="flex flex-col items-center gap-0.5">
                                                                                    <UploadCloud size={14} className="text-blue-500" />
                                                                                    <span className="text-[7px] font-bold text-blue-600/80 uppercase">View</span>
                                                                                </div>
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[8px] text-slate-300 font-medium uppercase tracking-wider block">No Img</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                                    <History size={48} strokeWidth={1} className="mb-4 opacity-20" />
                                                    <p className="text-sm font-medium">No modification history found.</p>
                                                    <p className="text-xs opacity-60 mt-1">Changes to stock limits will appear here.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
                                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-orange-100/50 p-2.5 rounded-xl text-orange-600 shadow-sm border border-orange-100">
                                                    <History size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Audit Trail</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Track all movements and modifications</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                                                {itemHistory.length} Record{itemHistory.length !== 1 && 's'} Found
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto flex-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                                        <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                                        <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Event Type</th>
                                                        <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Identity</th>
                                                        <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Event Detail</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {/* Initial Creation Record */}
                                                    {itemHistory.length === 0 && (
                                                        <tr className="bg-slate-50/20">
                                                            <td className="px-8 py-5 text-xs text-slate-500 font-mono">
                                                                {new Date(selectedItemAction.created_at).toLocaleString()}
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                    System Entry
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5 text-xs text-slate-400 italic">
                                                                System
                                                            </td>
                                                            <td className="px-8 py-5 text-xs text-slate-500 italic">
                                                                Item created in initial registry
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {itemHistory.map(event => (
                                                        <tr key={event.id} className="hover:bg-blue-50/30 transition-colors group">
                                                            <td className="px-8 py-5 text-xs text-slate-600 font-mono whitespace-nowrap">
                                                                <div className="font-bold text-slate-700">{new Date(event.created_at).toLocaleDateString()}</div>
                                                                <div className="text-[10px] text-slate-400 mt-1">{new Date(event.created_at).toLocaleTimeString()}</div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className={clsx(
                                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm",
                                                                    event.event_type === 'CREATED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                                        event.event_type === 'UPDATED' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                            event.event_type === 'DEACTIVATED' ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                                                event.event_type === 'REACTIVATED' ? "bg-teal-50 text-teal-700 border-teal-100" :
                                                                                    "bg-slate-50 text-slate-600 border-slate-200"
                                                                )}>
                                                                    <div className={clsx(
                                                                        "w-1.5 h-1.5 rounded-full",
                                                                        event.event_type === 'CREATED' ? "bg-emerald-500" :
                                                                            event.event_type === 'UPDATED' ? "bg-blue-500" :
                                                                                event.event_type === 'DEACTIVATED' ? "bg-rose-500" :
                                                                                    event.event_type === 'REACTIVATED' ? "bg-teal-500" :
                                                                                        "bg-slate-500"
                                                                    )}></div>
                                                                    {event.event_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-100 to-white text-slate-500 flex items-center justify-center text-[10px] font-black border border-slate-200 shadow-sm">
                                                                        {(event.performed_by_user?.email || '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-700">{event.performed_by_user?.email || 'Unknown User'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5 text-xs text-slate-600 font-medium max-w-xs truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:max-w-none transition-all">
                                                                {event.notes}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Image Preview Modal (Corporate Style) */}
            {/* Limit History Modal */}

            {
                isEditLimitsOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col ring-1 ring-slate-900/5 max-h-[90vh]">
                            <div className="bg-primary-900 px-8 py-5 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Edit Stock Limits</h2>
                                    <p className="text-blue-200 text-xs mt-0.5">Modify min/max thresholds and authorization details</p>
                                </div>
                                <button
                                    onClick={() => setIsEditLimitsOpen(false)}
                                    className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Core Limits & Requestor */}
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Thresholds</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min Stock</label>
                                                        <span className="text-[10px] font-mono text-slate-400">Current: <strong className="text-slate-700">{selectedItemAction?.min_stock}</strong></span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={editLimitsForm.min_stock}
                                                        onChange={(e) => setEditLimitsForm({ ...editLimitsForm, min_stock: e.target.value })}
                                                        className="w-full pl-3 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm placeholder-slate-300"
                                                        placeholder="New Min..."
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Max Stock</label>
                                                        <span className="text-[10px] font-mono text-slate-400">Current: <strong className="text-slate-700">{selectedItemAction?.max_stock}</strong></span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={editLimitsForm.max_stock}
                                                        onChange={(e) => setEditLimitsForm({ ...editLimitsForm, max_stock: e.target.value })}
                                                        className="w-full pl-3 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm placeholder-slate-300"
                                                        placeholder="New Max..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Requestor Info</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Requestor Name</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                            <User size={16} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={editLimitsForm.requested_by}
                                                            onChange={(e) => setEditLimitsForm({ ...editLimitsForm, requested_by: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                                            placeholder="Name..."
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Job Title / Position</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                            <Tag size={16} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={editLimitsForm.requested_by_position}
                                                            onChange={(e) => setEditLimitsForm({ ...editLimitsForm, requested_by_position: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                                            placeholder="e.g. Production Manager"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Auth, Justification, Evidence */}
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 h-full">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Authorization & Evidence</h4>

                                            <div className="mb-5">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Justification</label>
                                                <textarea
                                                    value={editLimitsForm.justification}
                                                    onChange={(e) => setEditLimitsForm({ ...editLimitsForm, justification: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none shadow-sm"
                                                    placeholder="Reason for this modification..."
                                                />
                                            </div>

                                            <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 mb-4 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                                                        <Check size={16} strokeWidth={3} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-900 uppercase">Chinese Auth</h4>
                                                        <p className="text-[10px] text-slate-500">Required for specific limits</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={editLimitsForm.chinese_auth}
                                                        onChange={(e) => setEditLimitsForm({ ...editLimitsForm, chinese_auth: e.target.checked })}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>

                                            {editLimitsForm.chinese_auth && (
                                                <div className="mb-4 pl-4 border-l-2 border-blue-500 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1.5">Authorized By Name</label>
                                                    <input
                                                        type="text"
                                                        value={editLimitsForm.chinese_authorizer}
                                                        onChange={(e) => setEditLimitsForm({ ...editLimitsForm, chinese_authorizer: e.target.value })}
                                                        className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-blue-300"
                                                        placeholder="Enter name..."
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Evidence Document</label>
                                                <label className="cursor-pointer flex items-center justify-center w-full px-4 py-3 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-600 transition-colors gap-2 group">
                                                    <UploadCloud size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    <span className="group-hover:text-blue-600 transition-colors">Import Image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => setEditLimitsForm({ ...editLimitsForm, evidence_file: e.target.files[0] })}
                                                    />
                                                </label>
                                                {editLimitsForm.evidence_file && (
                                                    <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 inline-flex">
                                                        <Check size={12} strokeWidth={3} />
                                                        {editLimitsForm.evidence_file.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modifier Details Section (Full Width Bottom) */}
                                <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Modifier Details (You)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Name</label>
                                            <input
                                                type="text"
                                                value={editLimitsForm.modifier_name}
                                                onChange={(e) => setEditLimitsForm({ ...editLimitsForm, modifier_name: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Position</label>
                                            <input
                                                type="text"
                                                value={editLimitsForm.modifier_position}
                                                onChange={(e) => setEditLimitsForm({ ...editLimitsForm, modifier_position: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                                placeholder="e.g. Supervisor"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Area / Dept</label>
                                            <input
                                                type="text"
                                                value={editLimitsForm.modifier_area}
                                                onChange={(e) => setEditLimitsForm({ ...editLimitsForm, modifier_area: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                                placeholder="e.g. Warehouse"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 px-8 py-5 flex justify-end gap-3 border-t border-slate-200 shrink-0">
                                <button
                                    onClick={() => setIsEditLimitsOpen(false)}
                                    className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors hover:bg-slate-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveLimits}
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }{/* Image Preview Modal (Corporate Style) */}
            {
                previewImage && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 p-2 backdrop-blur-md transition-all duration-300"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[95vh] overflow-hidden flex flex-col border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-8 py-5 flex justify-between items-center border-b border-blue-700 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1.5 bg-orange-500 rounded-full"></div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider text-2xl">IMAGE VIEWER</h3>
                                        <p className="text-blue-200 text-xs uppercase tracking-[0.25em]">Wasion Inventory System</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="text-blue-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 bg-slate-900/5 flex items-center justify-center p-4 overflow-hidden relative">
                                {/* Mesh Background Pattern */}
                                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                <img
                                    src={previewImage}
                                    alt="Detail View"
                                    className="max-w-full max-h-full object-contain shadow-2xl drop-shadow-2xl rounded-lg"
                                />
                            </div>

                            {/* Footer with Close Button */}
                            <div className="bg-white p-5 items-center justify-end flex border-t border-slate-100 shrink-0">
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="px-10 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase text-sm tracking-widest rounded-xl transition-colors border border-slate-200 hover:border-slate-300 shadow-sm"
                                >
                                    Close Viewer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
