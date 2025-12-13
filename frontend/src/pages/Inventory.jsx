import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Package, AlertCircle, Loader2, UploadCloud, Box, ClipboardList, MapPin, User, Check, X, Tag, Minus, History } from 'lucide-react'
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

            const materialsWithSignedUrls = await Promise.all(data.map(async (m) => {
                if (m.image_url && !m.image_url.startsWith('http')) {
                    const { data: signed } = await supabase.storage.from('material-images').createSignedUrl(m.image_url, 3600)
                    return { ...m, signed_image_url: signed?.signedUrl }
                }
                return { ...m, signed_image_url: m.image_url }
            }))

            setMaterials(materialsWithSignedUrls)
        } catch (error) {
            console.error('Error fetching materials:', error)
            setError(error.message)
        } finally {
            setLoading(false)
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
                <div className="px-8 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="w-80 flex flex-col items-center">
                        <img src="/wasion_logo_large.png" alt="Wasion Logo" className="w-full object-contain" />
                        <div className="text-white text-[10px] font-bold tracking-[0.8em] uppercase opacity-90 mt-0 text-center w-full leading-none">
                            Made in Mexico
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                            Inventory Management
                        </h1>
                        <p className="text-primary-200 mt-0 text-sm font-medium">Track items, stock levels, and locations.</p>
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
                                    <th className="px-6 py-1 align-top w-20">Image</th>
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
                                        <tr key={item.id} className={clsx(
                                            "group transition-colors border-b border-slate-100 last:border-none",
                                            item.current_stock < item.min_stock ? "bg-red-50 hover:bg-red-100" :
                                                item.current_stock === item.min_stock ? "bg-amber-50 hover:bg-amber-100" :
                                                    "odd:bg-white even:bg-slate-50 hover:bg-blue-50/50"
                                        )}>
                                            <td className="px-6 py-2.5 align-middle">
                                                {item.signed_image_url ? (
                                                    <img src={item.signed_image_url} alt={item.name} className="w-10 h-10 object-cover rounded shadow-sm border border-slate-200 mx-auto" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400 mx-auto border border-slate-200">
                                                        <Package size={18} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-2.5 align-middle">
                                                <div className="font-bold text-slate-800 text-[11px]">{item.part_number}</div>
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
                                                        onClick={() => handleToggleStatus(item)}
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
        </div>
    )
}
