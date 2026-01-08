import React, { useState } from 'react'
import { X, CheckCircle, Clock, XCircle, AlertCircle, FileText, User, Image as ImageIcon, Paperclip, RotateCw, Printer } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { requisitionService } from '../services/requisitions'
import { supabase } from '../lib/supabase'

export default function RequisitionDetailModal({ isOpen, onClose, requisition, materials, usersMap, currentUser, onActionSuccess }) {
    if (!isOpen || !requisition) return null

    const [actionLoading, setActionLoading] = useState(false)
    const [attachments, setAttachments] = useState([])
    const [loadingAttachments, setLoadingAttachments] = useState(false)
    const [expandedImage, setExpandedImage] = useState(null)
    const [isResubmitting, setIsResubmitting] = useState(false)
    const [resubmitComment, setResubmitComment] = useState('')

    // Load attachments
    React.useEffect(() => {
        if (isOpen && requisition?.id) {
            loadAttachments(requisition.id)
        }
    }, [isOpen, requisition])

    const loadAttachments = async (reqId) => {
        setLoadingAttachments(true)
        try {
            const { data, error } = await supabase
                .from('requisition_attachments')
                .select('*')
                .eq('requisition_id', reqId)

            if (error) throw error

            // Resolve full URLs (Signed URLs in case bucket is private)
            const resolved = await Promise.all(data.map(async att => {
                // Try signed URL first (safer and works for private buckets)
                const { data: signed, error: signError } = await supabase.storage
                    .from('requisition-attachments')
                    .createSignedUrl(att.url, 60 * 60) // 1 hour

                if (signError || !signed) {
                    // Fallback to public URL logic if signing fails (or just to debug)
                    const { data: { publicUrl } } = supabase.storage
                        .from('requisition-attachments')
                        .getPublicUrl(att.url)
                    return { ...att, publicUrl }
                }

                return { ...att, publicUrl: signed.signedUrl }
            }))
            setAttachments(resolved)
        } catch (e) {
            console.error("Error loading attachments:", e)
        } finally {
            setLoadingAttachments(false)
        }
    }

    // Helper for Status Colors
    const getStatusColor = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200'
            case 'UNDER_APPROVAL': return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'APPROVED_PRE_PURCHASE': return 'bg-green-50 text-green-700 border-green-200'
            case 'REWORK_REQUIRED': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'REJECTED_FINAL': return 'bg-red-50 text-red-700 border-red-200'
            case 'CANCELED': return 'bg-slate-50 text-slate-500 border-slate-200'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    const getStepIcon = (status) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle size={18} className="text-green-600" />
            case 'REJECTED': return <XCircle size={18} className="text-red-600" />
            case 'PENDING': return <Clock size={18} className="text-blue-600 animate-pulse" />
            case 'WAITING': return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
            case 'SKIPPED': return <div className="w-4 h-4 rounded-full bg-slate-200" />
            default: return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
        }
    }

    // --- Permissions Logic ---
    const currentUserId = currentUser?.id

    // Check if user has a pending approval step
    const myPendingStep = requisition.approvals?.find(step =>
        step.step_status === 'PENDING' &&
        step.assigned_to_user_id === currentUserId
    )
    const isAssignedApprover = Boolean(myPendingStep)

    // Owner actions
    const isOwner = requisition.requester_id === currentUserId
    const canResubmit = requisition.status === 'REWORK_REQUIRED' && isOwner
    const canCancel = ['DRAFT'].includes(requisition.status) && isOwner

    // --- Handlers ---
    const handleApprove = async () => {
        if (!confirm("Are you sure you want to APPROVE this requisition?")) return
        setActionLoading(true)
        try {
            await requisitionService.approve(requisition.id)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = async () => {
        const comment = prompt("Por favor, ingrese el motivo del rechazo o corrección requerida:")
        if (comment === null) return // User cancelled prompt
        if (!comment.trim()) {
            alert("El comentario es obligatorio para rechazar.")
            return
        }

        setActionLoading(true)
        try {
            await requisitionService.reject(requisition.id, comment)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleResubmitClick = () => {
        setIsResubmitting(true)
    }

    const submitResubmission = async () => {
        if (!resubmitComment.trim()) {
            alert("Please provide a correction note or justification for this resubmission.")
            return
        }
        if (!confirm("Confirm resubmission?")) return

        setActionLoading(true)
        try {
            await requisitionService.resubmit(requisition.id, {
                resubmission_comment: resubmitComment
            })
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to CANCEL this requisition? It cannot be undone.")) return
        setActionLoading(true)
        try {
            await requisitionService.cancel(requisition.id)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-blue-100">

                {/* Header */}
                <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                                {requisition.req_number || 'New Draft'}
                                <span className={clsx("text-xs px-2.5 py-0.5 rounded-full font-bold border shadow-sm", getStatusColor(requisition.status))}>
                                    {requisition.status?.replace(/_/g, " ")}
                                </span>
                            </h2>
                            <p className="text-sm text-blue-600/80 font-medium flex items-center gap-2 mt-1">
                                <Clock size={14} />
                                Submitted: {requisition.submitted_at ? format(new Date(requisition.submitted_at), 'PPP p') : 'Not Submitted'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-xs uppercase tracking-wider font-bold text-blue-500/80 flex items-center gap-1.5 mb-2">
                                <User size={12} /> Requester
                            </span>
                            <div className="font-semibold text-slate-800 text-lg">
                                {requisition.requester_name || requisition.requester?.full_name || requisition.requester?.email || requisition.requester_id || 'Unknown'}
                            </div>
                        </div>
                        <div className="p-5 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-xs uppercase tracking-wider font-bold text-blue-500/80 flex items-center gap-1.5 mb-2">
                                <AlertCircle size={12} /> Priority
                            </span>
                            <div className={clsx("font-bold text-lg inline-flex items-center gap-1.5", requisition.priority === 'URGENT' ? 'text-red-600' : 'text-slate-800')}>
                                {requisition.priority}
                            </div>
                        </div>
                        <div className="p-5 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-xs uppercase tracking-wider font-bold text-blue-500/80 flex items-center gap-1.5 mb-2">
                                <AlertCircle size={12} /> Criticality
                            </span>
                            <div className="font-bold text-lg text-slate-800">
                                {(() => {
                                    const code = requisition.criticality_requested;
                                    const labels = {
                                        'C1': 'C1 - Normal',
                                        'C2': 'C2 - Urgent',
                                        'C3': 'C3 - Crítico',
                                        'C4': 'C4 - Proyecto Especial'
                                    };
                                    return labels[code] || code || 'N/A';
                                })()}
                            </div>
                        </div>
                        <div className="p-5 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-xs uppercase tracking-wider font-bold text-blue-500/80 flex items-center gap-1.5 mb-2">
                                <FileText size={12} /> Justification
                            </span>
                            <p className="text-sm text-slate-600 italic leading-relaxed">
                                "{requisition.justification || requisition.purchase_justification || 'No justification provided.'}"
                            </p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">1</span>
                            Requested Items
                        </h3>
                        <div className="border border-blue-100 rounded-xl overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-blue-50/50 text-blue-800 font-semibold border-b border-blue-100">
                                    <tr>
                                        <th className="px-6 py-3">Material / Part #</th>
                                        <th className="px-3 py-3 text-center">Image</th>
                                        <th className="px-6 py-3 text-center">Qty</th>
                                        <th className="px-6 py-3 text-left">Cost Center</th>
                                        <th className="px-6 py-3 text-left">Project</th>
                                        <th className="px-6 py-3 text-right">Unit Price</th> {/* If available */}
                                        <th className="px-6 py-3 text-right">Ext. Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-50">
                                    {requisition.items?.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">
                                                    {materials?.[item.material_id]?.name || item.material_name || item.material_id}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                                                    Part #: {materials?.[item.material_id]?.part_number || item.part_number || 'N/A'} <span className="text-slate-300 mx-1">|</span> ID: {item.material_id}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                {materials && materials[item.material_id]?.image_url ? (
                                                    <div
                                                        className="h-10 w-10 mx-auto rounded border border-slate-200 bg-white cursor-pointer hover:border-blue-400 overflow-hidden"
                                                        onClick={() => setExpandedImage(materials[item.material_id]?.image_url)}
                                                    >
                                                        <img
                                                            src={materials[item.material_id]?.image_url}
                                                            alt="mat"
                                                            className="h-full w-full object-contain"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-10 w-10 mx-auto rounded border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                                                        <ImageIcon size={16} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-700 bg-slate-50/50">{item.quantity_requested}</td>
                                            <td className="px-6 py-4 text-left text-slate-600 text-sm">{item.cost_center || '-'}</td>
                                            <td className="px-6 py-4 text-left text-slate-600 text-sm">{item.project_code || '-'}</td>
                                            <td className="px-6 py-4 text-right text-slate-400">-</td>
                                            <td className="px-6 py-4 text-right text-slate-400">-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">2</span>
                            Reference Images / Evidence
                        </h3>
                        {loadingAttachments ? (
                            <div className="text-sm text-slate-400 italic pl-8">Loading attachments...</div>
                        ) : attachments.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-8">
                                {attachments.map(att => (
                                    <div key={att.id} className="group relative bg-white p-2 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
                                        <div
                                            className="h-32 bg-slate-100 rounded-lg overflow-hidden cursor-pointer mb-2"
                                            onClick={() => setExpandedImage(att.publicUrl)}
                                        >
                                            <img src={att.publicUrl} alt={att.filename} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                        <div className="text-xs font-medium text-slate-700 truncate px-1" title={att.filename}>
                                            {att.filename}
                                        </div>
                                        <div className="text-[10px] text-slate-400 px-1 mt-0.5">
                                            {format(new Date(att.uploaded_at), 'MMM d, p')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic pl-8 bg-slate-50/50 p-4 rounded-lg border border-dashed border-slate-200">
                                No additional images or documents attached.
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">3</span>
                            Approval Workflow
                        </h3>
                        <div className="relative pl-4 border-l-2 border-blue-100 space-y-8 my-2">
                            {(requisition.approvals || []).sort((a, b) => a.step_order - b.step_order).map((step) => (
                                <div key={step.id} className="relative pl-8">
                                    <div className={clsx("absolute -left-[1.6rem] top-0 p-1.5 rounded-full border shadow-sm transition-all",
                                        step.step_status === 'APPROVED' ? "bg-green-100 border-green-200" :
                                            step.step_status === 'PENDING' ? "bg-blue-100 border-blue-200" :
                                                step.step_status === 'REJECTED' ? "bg-red-100 border-red-200" :
                                                    "bg-white border-slate-200"
                                    )}>
                                        {getStepIcon(step.step_status)}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 bg-white p-4 rounded-xl border border-blue-50 shadow-sm hover:border-blue-200 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">Step {step.step_order}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-base">{step.step_name.replace(/_/g, ' ')}</h4>
                                            <div className="text-sm text-slate-500 mt-1 font-medium">
                                                Assigned: <span className="text-slate-700 font-bold">
                                                    {step.assigned_to_user_id ? (usersMap && usersMap[step.assigned_to_user_id] ? usersMap[step.assigned_to_user_id] : 'Loading...') : 'System'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className={clsx(
                                                "text-xs font-bold px-2.5 py-1 rounded-lg border uppercase shadow-sm tracking-wide",
                                                step.step_status === 'APPROVED' ? "bg-green-50 text-green-700 border-green-200" :
                                                    step.step_status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-200" :
                                                        step.step_status === 'PENDING' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            "bg-slate-50 text-slate-400 border-slate-200"
                                            )}>
                                                {step.step_status}
                                            </span>
                                            {step.action_at && (
                                                <div className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {format(new Date(step.action_at), 'MMM d, p')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Comments */}
                                    {step.comment && (
                                        <div className="mt-3 ml-2 bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm text-amber-800 italic flex gap-3 shadow-sm">
                                            <div className="mt-1 text-amber-400"><FileText size={14} /></div>
                                            "{step.comment}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-blue-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex gap-2">
                        {canResubmit && !isResubmitting && (
                            <button
                                onClick={handleResubmitClick}
                                disabled={actionLoading}
                                className="px-5 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <RotateCw size={16} /> Resubmit Requisition
                            </button>
                        )}

                        {isResubmitting && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Enter correction note..."
                                    className="border border-amber-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
                                    value={resubmitComment}
                                    onChange={e => setResubmitComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && submitResubmission()}
                                />
                                <button
                                    onClick={submitResubmission}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-md"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => setIsResubmitting(false)}
                                    className="px-3 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        {canCancel && (
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? 'Processing...' : 'Cancel Requisition'}
                            </button>
                        )}
                        <button
                            onClick={() => window.open(`/print/requisition/${requisition.id}`, '_blank')}
                            className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Printer size={16} /> Print Format
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={actionLoading} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                            Close
                        </button>

                        {isAssignedApprover && (
                            <>
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md shadow-red-200 disabled:opacity-50 btn-effect"
                                >
                                    {actionLoading ? '...' : 'Rechazar / Corregir'}
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50 btn-effect flex items-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    {actionLoading ? 'Approving...' : 'Approve'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {
                expandedImage && (
                    <div
                        className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setExpandedImage(null)}
                    >
                        <button className="absolute top-4 right-4 text-white hover:text-red-400 transition-colors">
                            <X size={32} />
                        </button>
                        <img src={expandedImage} alt="Expanded" className="max-w-full max-h-[90vh] rounded shadow-2xl" />
                    </div>
                )
            }
        </div >
    )
}
