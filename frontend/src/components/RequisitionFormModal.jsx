import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Send, AlertCircle, Paperclip, FileText, Image as ImageIcon, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import MaterialAutocomplete from './MaterialAutocomplete'
import { requisitionService } from '../services/requisitions'
import { supabase } from '../lib/supabase'

export default function RequisitionFormModal({ isOpen, onClose, onSuccess, materials, users: propUsers, currentUser, initialItems = [] }) {
    if (!isOpen) return null

    // --- State ---
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isSubmittingMode, setIsSubmittingMode] = useState(false)
    const [expandedImage, setExpandedImage] = useState(null) // URL for lightbox
    const fileInputRef = React.useRef(null)
    const [uploadTargetId, setUploadTargetId] = useState(null) // itemId that triggered upload
    const [openCauseDropdownId, setOpenCauseDropdownId] = useState(null) // ID of item with open cause dropdown
    const [openCostCenterDropdownId, setOpenCostCenterDropdownId] = useState(null) // ID of item with open cost center dropdown

    // Form Data
    const [header, setHeader] = useState({
        priority: 'NORMAL',
        justification: '',
        department: currentUser?.department || '',
        job_title: currentUser?.job_title || '', // If avail in profile
        requester_name: '', // Empty by default
        cause: '', // OP, LS, etc.
        criticality_requested: '', // C1-C4
    })

    const [items, setItems] = useState([
        { id: Date.now(), material_id: null, quantity: '', unit: 'EA', notes: '', supplier: '', cost_center: '', project_code: '', monthly_consumption: '', cause: '' }
    ])

    // Attachments
    const [pendingFiles, setPendingFiles] = useState([]) // File objects
    const [previews, setPreviews] = useState([]) // Object URLs for preview

    // Approvers
    const [users, setUsers] = useState([])

    // Configurable Team Approvals
    const [teamApprovers, setTeamApprovers] = useState({
        mx1: { userId: '', order: '1' },
        mx2: { userId: '', order: '2' },
        ch1: { userId: '', order: '3' },
        ch2: { userId: '', order: '4' },
        gmx: { userId: '', order: '5' },
        gch: { userId: '', order: '6' }
    })

    // --- constants ---
    const CAUSE_OPTIONS = [
        { value: 'OP', label: 'OP (Operación normal)' },
        { value: 'LS', label: 'LS (Paro de linea)' },
        { value: 'HS', label: 'HS (Seguridad)' },
        { value: 'CR', label: 'CR (Requerimiento de cliente)' },
        { value: 'FC', label: 'FC (Proyecto de instalación facilities)' },
        { value: 'CM', label: 'CM (Producto o servicio no de linea o hecho a la medida)' },
        { value: 'MQ', label: 'MQ (Maquina especializada)' },
        { value: 'SA', label: 'SA (Aprovación especial requeida para procesar el requerimiento)' }
    ]

    const COST_CENTER_OPTIONS = [
        // Production
        { value: 'TP060000', label: 'TP060000 (Apportion-Semi-finished product shop)' },
        { value: 'TP070000', label: 'TP070000 (Finished product shop (three-phase table) 48 Electric meter)' },
        { value: 'TP080000', label: 'TP080000 (Finished product shop (Single-phase table) 34 Electric meter)' },
        { value: 'TP090000', label: 'TP090000 (Injection molding workshop)' },
        { value: 'TP100000', label: 'TP100000 (Own Production Recloser)' },
        { value: 'TP110000', label: 'TP110000 (Own Production)' },
        // Administration / Support
        { value: 'TA010000', label: 'TA010000 (Purchase Department)' },
        { value: 'TA010001', label: 'TA010001 (Warehouse Department)' },
        { value: 'TA010002', label: 'TA010002 (Logistics Department)' },
        { value: 'TA010003', label: 'TA010003 (Administration Department)' },
        { value: 'TA010004', label: 'TA010004 (Human Resources Department)' },
        { value: 'TA010005', label: 'TA010005 (Financial Department)' },
        { value: 'TA010006', label: 'TA010006 (Ministry of Security)' },
        { value: 'TA010008', label: 'TA010008 (Quality Department)' },
        { value: 'TA010009', label: 'TA010009 (Project Department)' },
        { value: 'TA010010', label: 'TA010010 (Legal Service Department)' },
        { value: 'TA010011', label: 'TA010011 (Public center GL account)' },
        // Sales / Service
        { value: 'TS010001', label: 'TS010001 (Technical Support Department)' },
        { value: 'TS010000', label: 'TS010000 (Sales Department)' },
        { value: 'TS010002', label: 'TS010002 (Sales Department-for store energy)' },
        { value: 'TS010003', label: 'TS010003 (Sales Department-for water meter)' },
        { value: 'TS010004', label: 'TS010004 (Sales Department-for recloser)' },
        { value: 'TS010005', label: 'TS010005 (Sales Department for transformer)' },
        // Other
        { value: 'TBD', label: 'TBD (The distribution to the productive cc will start at the time of starting)' }
    ]

    const CRITICALITY_OPTIONS = [
        { value: 'C1', label: 'C1 - Normal' },
        { value: 'C2', label: 'C2 - Urgente' },
        { value: 'C3', label: 'C3 - Crítico' },
        { value: 'C4', label: 'C4 - Proyecto Especial' }
    ]

    // --- Effects ---
    useEffect(() => {
        if (isOpen) {
            // Reset
            setHeader({
                priority: 'NORMAL',
                justification: '',
                department: currentUser?.department || '', // Ideally verify if profile has this now
                job_title: currentUser?.job_title || '',
                requester_name: '',
                cause: '',
                criticality_requested: ''
            })
            setItems([{ id: Date.now(), material_id: null, quantity: '', unit: 'EA', notes: '', supplier: '', cost_center: '', project_code: '', monthly_consumption: '', cause: '' }])
            setPendingFiles([])
            setPreviews([])
            setIsSubmittingMode(false)
            setError(null)
            setTeamApprovers({
                mx1: { userId: '', order: '1' },
                mx2: { userId: '', order: '2' },
                ch1: { userId: '', order: '3' },
                ch2: { userId: '', order: '4' },
                gmx: { userId: '', order: '5' },
                gch: { userId: '', order: '6' }
            })
            if (propUsers && propUsers.length > 0) {
                setUsers(propUsers)
            } else {
                loadUsers()
            }
        }
    }, [isOpen, propUsers])

    // Cleanup previews to avoid memory leaks
    useEffect(() => {
        return () => previews.forEach(p => URL.revokeObjectURL(p.url))
    }, [previews])

    // Handle initial items from parent (e.g. from Reports)
    useEffect(() => {
        if (isOpen) {
            if (initialItems && initialItems.length > 0) {
                const mappedItems = initialItems.map((item, index) => ({
                    id: Date.now() + index,
                    material_id: item.material_id,
                    quantity: item.quantity || '',
                    unit: item.unit || 'EA',
                    notes: item.notes || '',
                    supplier: '',
                    cost_center: '',
                    project_code: '',
                    monthly_consumption: '',
                    cause: ''
                }))
                setItems(mappedItems)
            } else {
                // Only reset if we are opening fresh without initial items
                // This prevents overwriting if user closes/reopens and we want persistence?
                // Actually, usually we want to reset on open.
                setItems([{ id: Date.now(), material_id: null, quantity: '', unit: 'EA', notes: '', supplier: '', cost_center: '', project_code: '', monthly_consumption: '', cause: '' }])
            }
            // Reset header on open
            setHeader(prev => ({
                ...prev,
                justification: '',
                priority: 'NORMAL',
                requester_name: '',
                cause: '',
                criticality_requested: '',
                // Keep department/job_title from profile
            }))
            // Clear files
            setPendingFiles([])
            setPreviews([])
        }
    }, [isOpen, initialItems])

    const loadUsers = async () => {
        try {
            const list = await requisitionService.getUsers()
            setUsers(list)
        } catch (e) {
            console.error(e)
        }
    }

    // --- Handlers ---
    // Filter users for approver dropdowns (Exclude basic 'user' role)
    // Filter users for approver dropdowns (Exclude basic 'user' role)
    // Filter users for approver dropdowns (Exclude basic 'user' role)
    const approverUsers = (users || []).filter(u => {
        if (!u) return false
        const role = (u.role_name || u.role || '').toLowerCase().trim()
        return role !== 'user' && role !== ''
    })

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            setPendingFiles([...pendingFiles, ...newFiles])

            // Generate previews
            const newPreviews = newFiles.map(file => ({
                file,
                url: URL.createObjectURL(file),
                type: file.type
            }))
            setPreviews([...previews, ...newPreviews])
        }
    }

    const removeFile = (index) => {
        const newFiles = [...pendingFiles]
        const newPreviews = [...previews]

        URL.revokeObjectURL(newPreviews[index].url)

        newFiles.splice(index, 1)
        newPreviews.splice(index, 1)

        setPendingFiles(newFiles)
        setPreviews(newPreviews)
    }

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), material_id: null, quantity: '', unit: 'EA', notes: '', supplier: '', cost_center: '', project_code: '', monthly_consumption: '', cause: '' }])
    }

    const handleItemChange = (id, field, value) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    const handleMaterialSelect = (itemId, matId) => {
        let desc = ''
        let img = null
        let unit = 'EA' // Default
        if (materials && materials[matId]) {
            desc = materials[matId].description || materials[matId].name || ''
            img = materials[matId].image_url
            // Fetch dynamically
            if (materials[matId].unit) unit = materials[matId].unit
            else if (materials[matId].uom) unit = materials[matId].uom
        }

        setItems(items.map(i => i.id === itemId ? {
            ...i,
            material_id: matId,
            notes: desc,
            image_url: img,
            supplier: '',
            cost_center: '',
            unit: unit,
            quantity: '',
            cause: ''
        } : i))
    }

    const handleRemoveItem = (id) => {
        if (items.length > 1) setItems(items.filter(i => i.id !== id))
    }

    const handleUploadClick = (itemId) => {
        setUploadTargetId(itemId)
        fileInputRef.current.click()
    }

    const handleMaterialImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file || !uploadTargetId) return

        try {
            setLoading(true)
            const item = items.find(i => i.id === uploadTargetId)
            const materialId = item.material_id

            // 1. Upload
            const fileExt = file.name.split('.').pop()
            const fileName = `${materialId}/${Date.now()}.${fileExt}`
            const { data, error: upError } = await supabase.storage
                .from('material-images')
                .upload(fileName, file)

            if (upError) throw upError

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('material-images')
                .getPublicUrl(fileName)

            // 2. Update Material (if allowed)
            // Note: This relies on authenticated user having UPDATE policy on materials table.
            // If this fails, we at least update local state for this session.
            const { error: dbError } = await supabase
                .from('materials')
                .update({ image_url: publicUrl })
                .eq('id', materialId)

            if (dbError) {
                console.warn("Could not update material record:", dbError)
                // We proceed anyway to show the image in this session
            }

            // 3. Update Local State
            setItems(items.map(i => i.id === uploadTargetId ? { ...i, image_url: publicUrl } : i))

        } catch (err) {
            console.error("Upload failed", err)
            setError("Failed to upload image")
        } finally {
            setLoading(false)
            setUploadTargetId(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const validate = (isSubmit = false) => {
        // Strict Validation - All Visible Fields
        // Header
        if (!header.requester_name.trim()) return "Requester Name is required."
        if (!header.department.trim()) return "Department is required."
        if (!header.job_title.trim()) return "Job Title is required."
        if (!header.justification.trim()) return "Purchase Justification is required."
        if (!header.criticality_requested) return "Req. Criticality selection is required."

        // Items
        if (items.length === 0) return "At least one item is required."

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const lineNum = i + 1
            if (!item.material_id) return `Line ${lineNum}: Material is required.`
            if (!item.notes || !item.notes.trim()) return `Line ${lineNum}: Description/Specs is required.`
            if (!item.quantity || item.quantity <= 0) return `Line ${lineNum}: Quantity must be > 0.`
            if (!item.unit || !item.unit.trim()) return `Line ${lineNum}: Unit is required.`
            if (!item.cause) return `Line ${lineNum}: Cause is required.`
            if (!item.cost_center || !item.cost_center.trim()) return `Line ${lineNum}: Cost Center is required.`
        }

        return null
    }

    // --- Core Logic: Save/Submit ---
    const handleSubmitClick = () => {
        const valError = validate(false)
        if (valError) {
            setError(valError)
            return
        }
        setError(null)
        setIsSubmittingMode(true)
    }

    const saveOrSubmit = async (isSubmit) => {
        const valError = validate(isSubmit)
        if (valError) { setError(valError); return }

        if (isSubmit) {
            // 1. Definition of potential approvers in hierarchical order
            // Note: We ignore the 'order' from state and calculate it dynamically
            const potentialApprovers = [
                { id: 'mx1', ...teamApprovers.mx1, label: 'Team Mexicano (1)' },
                { id: 'mx2', ...teamApprovers.mx2, label: 'Team Mexicano (2)' },
                { id: 'ch1', ...teamApprovers.ch1, label: 'Team Chino (1)' },
                { id: 'ch2', ...teamApprovers.ch2, label: 'Team Chino (2)' },
                { id: 'gmx', ...teamApprovers.gmx, label: 'Gerente Mexicano' },
                { id: 'gch', ...teamApprovers.gch, label: 'Gerente Chino' }
            ]

            // 2. Filter selected approvers
            const selectedApprovers = potentialApprovers.filter(a => a.userId && a.userId.trim() !== '')

            // 3. Validation: At least one approver required
            if (selectedApprovers.length === 0) {
                setError("At least one Approver must be selected.")
                return
            }
        }

        setLoading(true)
        setError(null)
        try {
            // 1. Create Payload (without attachments)
            const payload = {
                ...header,
                priority: header.criticality_requested === 'C2' ? 'HIGH' : header.criticality_requested === 'C3' ? 'URGENT' : 'NORMAL', // Map C-levels to old Priority
                items: items.map(i => ({
                    ...i,
                    quantity_requested: parseInt(i.quantity),
                    monthly_consumption: i.monthly_consumption ? parseFloat(i.monthly_consumption) : null
                })),
                attachments: [] // We add them via separate upload logic
            }

            // 2. Create Draft in DB
            const req = await requisitionService.createDraft(payload)
            const reqId = req.id

            // 3. Upload Files
            const uploadedMetadata = []
            if (pendingFiles.length > 0) {
                for (const file of pendingFiles) {
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${reqId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`

                    const { data, error: upError } = await supabase.storage
                        .from('requisition-attachments')
                        .upload(fileName, file)

                    if (upError) throw upError

                    uploadedMetadata.push({
                        requisition_id: reqId,
                        filename: file.name,
                        url: data.path, // Store the path key
                        uploaded_by: currentUser?.id // Or let backend handle default?
                    })
                }

                // 4. Insert Attachment Records via DB directly (since we have RLS enabled)
                // Note: We need 'requisition_attachments' table RLS to allow INSERT for auth users.
                // The service createDraft handles creating attachment records IF passed in payload.
                // But we wanted to upload first to get URLs.
                // So now we can call a simple insert.
                if (uploadedMetadata.length > 0) {
                    const { error: insError } = await supabase
                        .from('requisition_attachments')
                        .insert(uploadedMetadata)
                    if (insError) throw insError
                }
            }



            // 5. Submit Logic (Custom Approvals)
            if (isSubmit) {
                const potentialApprovers = [
                    { id: 'mx1', ...teamApprovers.mx1, label: 'Team Mexicano (1)' },
                    { id: 'mx2', ...teamApprovers.mx2, label: 'Team Mexicano (2)' },
                    { id: 'ch1', ...teamApprovers.ch1, label: 'Team Chino (1)' },
                    { id: 'ch2', ...teamApprovers.ch2, label: 'Team Chino (2)' },
                    { id: 'gmx', ...teamApprovers.gmx, label: 'Gerente Mexicano' },
                    { id: 'gch', ...teamApprovers.gch, label: 'Gerente Chino' }
                ]

                // Filter and Auto-Assign Order
                const customApprovals = potentialApprovers
                    .filter(a => a.userId && a.userId.trim() !== '')
                    .map((a, index) => ({
                        user_id: a.userId,
                        label: a.label,
                        order: index + 1 // 1-based sequential order
                    }))

                await requisitionService.submitRequisition(reqId, {
                    custom_approvals: customApprovals
                })
            }

            if (onSuccess) await onSuccess()
            onClose()

        } catch (e) {
            console.error(e)
            setError(e.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[90vw] h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-primary-800 bg-primary-900 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">New Requisition</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-primary-200 hover:text-white hover:bg-primary-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content - 2 Columns */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* LEFT COLUMN: FORM */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <form id="requisition-form" onSubmit={(e) => e.preventDefault()} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="flex flex-col h-full">
                            {!isSubmittingMode ? (
                                <>
                                    {/* STATIC HEADER: Info & Justification */}
                                    <div className="p-4 space-y-3 shrink-0 border-b border-slate-100 shadow-sm z-10 bg-white">
                                        {error && (
                                            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200 shadow-sm">
                                                <AlertCircle size={16} />
                                                {error}
                                            </div>
                                        )}

                                        {/* Section 2: Info (Auto) */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div>
                                                <label className="text-[10px] uppercase text-slate-400 font-bold">Requester</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-none p-0 text-xs text-slate-700 focus:ring-0"
                                                    placeholder="Enter Name"
                                                    value={header.requester_name}
                                                    onChange={e => setHeader({ ...header, requester_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-slate-400 font-bold">Department</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-none p-0 text-xs text-slate-700 focus:ring-0"
                                                    placeholder="Enter Dept"
                                                    value={header.department}
                                                    onChange={e => setHeader({ ...header, department: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-slate-400 font-bold">Job Title</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-none p-0 text-xs text-slate-700 focus:ring-0"
                                                    placeholder="Enter Title"
                                                    value={header.job_title}
                                                    onChange={e => setHeader({ ...header, job_title: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-slate-400 font-bold">Date</label>
                                                <div className="text-xs font-medium text-slate-700">{new Date().toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        {/* Section 3: Justifications */}
                                        <div>
                                            <label className="block text-xs font-bold text-primary-900 uppercase tracking-wider mb-1.5">Purchase Justification (Detailed)</label>
                                            <textarea
                                                className="w-full rounded-lg border-slate-300 focus:ring-primary-500 focus:border-primary-500 placeholder:text-slate-400 text-sm"
                                                rows={2}
                                                placeholder="explain the need, impact if not purchased, etc."
                                                value={header.justification}
                                                onChange={e => setHeader({ ...header, justification: e.target.value })}
                                            />
                                        </div>

                                        {/* Section 4: Items Header (Fixed) */}
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-bold text-primary-900 flex items-center gap-2">
                                                    <span className="bg-primary-100 text-primary-700 p-1 rounded">📦</span>
                                                    Line Items
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-primary-900 uppercase tracking-wider">Req. Criticality</label>
                                                    <select
                                                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 font-medium shadow-sm transition-shadow min-w-[150px]"
                                                        value={header.criticality_requested}
                                                        onChange={e => setHeader({ ...header, criticality_requested: e.target.value })}
                                                    >
                                                        <option value="">Select...</option>
                                                        {CRITICALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SCROLLABLE ITEMS SECTION */}
                                    <div className="flex-1 overflow-y-auto px-4 pb-4 bg-slate-50">
                                        <div className="pb-64"> {/* BIG PADDING FOR DROPDOWNS */}

                                            <div className="border border-slate-200 rounded-lg overflow-visible bg-white mt-0">
                                                <table className="w-full text-xs min-w-[600px] relative border-collapse">
                                                    <thead className="bg-primary-50 border-b border-primary-100 text-primary-800 font-semibold sticky top-0 z-20 shadow-sm">
                                                        <tr className="uppercase text-[10px] tracking-wider">
                                                            <th className="px-3 py-2 text-left w-[20%]">Material</th>
                                                            <th className="px-3 py-2 w-[33%]">Description</th>
                                                            <th className="px-2 py-2 w-[8%] text-center">Image</th>
                                                            <th className="px-2 py-2 w-[5%] text-center">Qty</th>
                                                            <th className="px-2 py-2 w-[5%] text-center">Unit</th>
                                                            <th className="px-3 py-2 w-[8%]">Supplier</th>
                                                            <th className="px-3 py-2 w-[5%]">Cause</th>
                                                            <th className="px-3 py-2 w-[8%]">Cost Center</th>
                                                            <th className="px-3 py-2 w-[12%]">Project</th>
                                                            <th className="px-2 py-2 w-[4%]"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {items.map((item, index) => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="px-3 py-2">
                                                                    <MaterialAutocomplete
                                                                        materials={materials}
                                                                        selectedMaterialId={item.material_id}
                                                                        onSelect={(id) => handleMaterialSelect(item.id, id)}
                                                                        error={!item.material_id}
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input type="text" className="w-full border-slate-200 rounded px-1 py-1 text-slate-600 focus:border-primary-500"
                                                                        placeholder="Specs, Color, Brand..." value={item.notes} onChange={e => handleItemChange(item.id, 'notes', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-2 flex justify-center">
                                                                    {item.image_url ? (
                                                                        <div
                                                                            className="h-8 w-8 shrink-0 rounded border border-slate-200 bg-white cursor-pointer hover:border-primary-400 overflow-hidden"
                                                                            onClick={() => setExpandedImage(item.image_url)}
                                                                            title="View Image"
                                                                        >
                                                                            <img src={item.image_url} alt="mat" className="h-full w-full object-contain" />
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className="h-8 w-8 shrink-0 rounded border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300 cursor-pointer hover:bg-slate-100 hover:text-primary-500 hover:border-primary-300 transition-colors"
                                                                            title="Click to upload image for this material"
                                                                            onClick={() => handleUploadClick(item.id)}
                                                                        >
                                                                            <ImageIcon size={14} />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input type="number" min="1" className="w-full text-center border-slate-300 rounded px-1 py-1"
                                                                        value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full text-center border-slate-200 rounded px-1 py-1 text-slate-600 focus:border-primary-500"
                                                                        value={item.unit}
                                                                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input type="text" className="w-full border-slate-200 rounded px-1 py-1 text-slate-600 focus:border-primary-500"
                                                                        placeholder="Optional" value={item.supplier} onChange={e => handleItemChange(item.id, 'supplier', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-2 relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenCauseDropdownId(openCauseDropdownId === item.id ? null : item.id)}
                                                                        className="w-full text-left rounded px-1 py-1 text-xs border border-slate-200 text-slate-600 bg-white focus:border-primary-500 flex items-center justify-between"
                                                                    >
                                                                        <span className="truncate">{item.cause || "Select"}</span>
                                                                        <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
                                                                    </button>

                                                                    {openCauseDropdownId === item.id && (
                                                                        <>
                                                                            <div className="fixed inset-0 z-10" onClick={() => setOpenCauseDropdownId(null)}></div>
                                                                            <div className="absolute z-20 top-full left-0 w-48 mt-1 bg-white border border-slate-200 rounded shadow-xl max-h-40 overflow-y-auto">
                                                                                {CAUSE_OPTIONS.map(opt => (
                                                                                    <div
                                                                                        key={opt.value}
                                                                                        className="px-2 py-1.5 text-xs hover:bg-primary-50 hover:text-primary-700 cursor-pointer text-slate-600 transition-colors border-b border-slate-50 last:border-0"
                                                                                        onClick={() => {
                                                                                            handleItemChange(item.id, 'cause', opt.value)
                                                                                            setOpenCauseDropdownId(null)
                                                                                        }}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-2 relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenCostCenterDropdownId(openCostCenterDropdownId === item.id ? null : item.id)}
                                                                        className="w-full text-left rounded px-1 py-1 text-xs border border-slate-200 text-slate-600 bg-white focus:border-primary-500 flex items-center justify-between"
                                                                    >
                                                                        <span className="truncate">{item.cost_center || "Select"}</span>
                                                                        <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
                                                                    </button>

                                                                    {openCostCenterDropdownId === item.id && (
                                                                        <>
                                                                            <div className="fixed inset-0 z-10" onClick={() => setOpenCostCenterDropdownId(null)}></div>
                                                                            <div className="absolute z-20 top-full left-0 w-32 mt-1 bg-white border border-slate-200 rounded shadow-xl max-h-40 overflow-y-auto">
                                                                                {COST_CENTER_OPTIONS.map(opt => (
                                                                                    <div
                                                                                        key={opt.value}
                                                                                        className="px-2 py-1.5 text-xs hover:bg-primary-50 hover:text-primary-700 cursor-pointer text-slate-600 transition-colors border-b border-slate-50 last:border-0"
                                                                                        onClick={() => {
                                                                                            handleItemChange(item.id, 'cost_center', opt.value)
                                                                                            setOpenCostCenterDropdownId(null)
                                                                                        }}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input type="text" className="w-full border-slate-200 rounded px-1 py-1 text-slate-600 focus:border-primary-500"
                                                                        placeholder="Proj #" value={item.project_code} onChange={e => handleItemChange(item.id, 'project_code', e.target.value)} />
                                                                </td>
                                                                <td className="px-2 py-2 text-center">
                                                                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                                    <button type="button" onClick={handleAddItem} className="text-primary-600 font-bold text-xs flex items-center gap-1 hover:text-primary-800">
                                                        <Plus size={14} /> Add Line
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // Submitting Mode (Approvers) - Scrollable
                                <div className="flex-1 overflow-y-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 py-10 px-6">
                                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                                        <h3 className="text-lg font-bold text-blue-900 mb-2">Ready to Submit?</h3>
                                        <p className="text-blue-700 text-sm mb-4">Please verify all data. Once submitted, the requisition enters the approval workflow.</p>
                                    </div>

                                    {(error) && (
                                        <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200 shadow-sm mx-auto max-w-md">
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <div className="max-w-2xl mx-auto space-y-6">
                                        {/* Team Mexicano */}
                                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                Team Mexicano
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500">Firma 1</label>
                                                        <select
                                                            className="w-full rounded border-slate-300 text-sm"
                                                            value={teamApprovers.mx1.userId}
                                                            onChange={e => setTeamApprovers({ ...teamApprovers, mx1: { ...teamApprovers.mx1, userId: e.target.value } })}
                                                        >
                                                            <option value="">Select User...</option>
                                                            {approverUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500">Firma 2</label>
                                                        <select
                                                            className="w-full rounded border-slate-300 text-sm"
                                                            value={teamApprovers.mx2.userId}
                                                            onChange={e => setTeamApprovers({ ...teamApprovers, mx2: { ...teamApprovers.mx2, userId: e.target.value } })}
                                                        >
                                                            <option value="">Select User...</option>
                                                            {approverUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Chino */}
                                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                Team Chino
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500">Firma 1</label>
                                                        <select
                                                            className="w-full rounded border-slate-300 text-sm"
                                                            value={teamApprovers.ch1.userId}
                                                            onChange={e => setTeamApprovers({ ...teamApprovers, ch1: { ...teamApprovers.ch1, userId: e.target.value } })}
                                                        >
                                                            <option value="">Select User...</option>
                                                            {approverUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500">Firma 2</label>
                                                        <select
                                                            className="w-full rounded border-slate-300 text-sm"
                                                            value={teamApprovers.ch2.userId}
                                                            onChange={e => setTeamApprovers({ ...teamApprovers, ch2: { ...teamApprovers.ch2, userId: e.target.value } })}
                                                        >
                                                            <option value="">Select User...</option>
                                                            {approverUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gerencia */}
                                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                Gerencia
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500">Gerente Mexicano</label>
                                                        <select
                                                            className="w-full rounded border-slate-300 text-sm"
                                                            value={teamApprovers.gmx.userId}
                                                            onChange={e => setTeamApprovers({ ...teamApprovers, gmx: { ...teamApprovers.gmx, userId: e.target.value } })}
                                                        >
                                                            <option value="">Select User...</option>
                                                            {approverUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500">Gerente Chino</label>
                                                        <select
                                                            className="w-full rounded border-slate-300 text-sm"
                                                            value={teamApprovers.gch.userId}
                                                            onChange={e => setTeamApprovers({ ...teamApprovers, gch: { ...teamApprovers.gch, userId: e.target.value } })}
                                                        >
                                                            <option value="">Select User...</option>
                                                            {approverUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* RIGHT COLUMN: ATTACHMENTS */}
                    <div className="w-full md:w-44 bg-slate-50 border-l border-slate-200 p-4 flex flex-col shrink-0">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Paperclip size={16} /> Evidence / Images
                        </h3>

                        <label className="cursor-pointer group flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl hover:bg-white hover:border-primary-400 transition-all mb-4">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <p className="mb-2 text-sm text-slate-500 group-hover:text-primary-600"><span className="font-semibold">Click to upload</span></p>
                                <p className="text-xs text-slate-400">JPG, PNG (MAX. 5MB)</p>
                            </div>
                            <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileSelect} />
                        </label>

                        <div className="flex-1 overflow-y-auto space-y-3">
                            {previews.map((preview, idx) => (
                                <div key={idx} className="relative group bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="h-16 w-16 shrink-0 bg-slate-100 rounded overflow-hidden">
                                        <img src={preview.url} alt="preview" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-700 truncate">{preview.file.name}</p>
                                        <p className="text-[10px] text-slate-400">{(preview.file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(idx)}
                                        className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 rounded-full p-1 shadow border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {previews.length === 0 && (
                                <div className="text-center text-slate-400 text-xs py-10 italic">
                                    No images attached yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                    {!isSubmittingMode ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium">Cancel</button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => saveOrSubmit(false)}
                                    disabled={loading}
                                    className="px-5 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-bold text-sm flex items-center gap-2"
                                >
                                    <Save size={16} /> Save Draft
                                </button>
                                <button
                                    onClick={() => handleSubmitClick()}
                                    disabled={loading}
                                    className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary-200"
                                >
                                    Next Step
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsSubmittingMode(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                            >
                                Back to Form
                            </button>
                            <button
                                onClick={() => saveOrSubmit(true)}
                                disabled={loading}
                                className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg ${loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'}`}
                            >
                                <Send size={16} />
                                {loading ? 'Processing...' : 'Confirm Submission'}
                            </button>
                        </>
                    )}
                </div>
            </div >

            {/* Lightbox */}
            {
                expandedImage && (
                    <div
                        className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setExpandedImage(null)}
                    >
                        <button className="absolute top-4 right-4 text-white hover:text-red-400">
                            <X size={32} />
                        </button>
                        <img src={expandedImage} alt="Expanded" className="max-w-full max-h-[90vh] rounded shadow-2xl" />
                    </div>
                )
            }

            {/* Hidden File Input for Material Image */}
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleMaterialImageUpload} />
        </div >
    )
}
